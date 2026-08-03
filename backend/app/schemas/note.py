"""Request/response schemas for notes.

These mirror the frontend Zod schema in
`frontend/src/lib/validations/note.ts` so client and server agree on shape,
limits, and the journal-needs-a-date rule.
"""

import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

NoteKind = Literal["journal", "note", "checklist"]
MoodKey = Literal["great", "good", "okay", "low", "rough"]

MAX_TAGS = 10
MAX_FOLDER = 40
MAX_ITEMS = 100


class ChecklistItem(BaseModel):
    """One row of a checklist note."""

    text: str = Field(max_length=200)
    done: bool = False

    @field_validator("text")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


# The slug pipeline, as (pattern, replacement) steps — order matters. Kept in
# lockstep with `normalizeTag`/`normalizeFolder` on the frontend.
_SLUG_STEPS = (
    (r"^#+", ""),         # drop leading hashes
    (r"\s+", "-"),        # whitespace → dash
    (r"[^a-z0-9-]", ""),  # drop other punctuation
    (r"-+", "-"),         # collapse repeated dashes
)


def _slugify(raw: str) -> str:
    """Lowercase + run the shared slug pipeline. May return ""."""
    slug = raw.strip().lower()
    for pattern, repl in _SLUG_STEPS:
        slug = re.sub(pattern, repl, slug)
    return slug.strip("-")


def normalize_tag(raw: str) -> str:
    """Slugify a raw tag so the same idea always groups together.

    Mirrors `normalizeTag` on the frontend: "#Work Stuff" -> "work-stuff".
    Returns "" if nothing usable remains.
    """
    return _slugify(raw)[:24]


def normalize_folder(raw: str | None) -> str | None:
    """Slugify a folder name, or return None for "no folder".

    Same slug rules as tags but single-valued and slightly longer; mirrors
    `normalizeFolder` on the frontend. "" / whitespace -> None.
    """
    if raw is None:
        return None
    return _slugify(raw)[:MAX_FOLDER] or None


class NoteBase(BaseModel):
    kind: NoteKind
    title: str = Field(min_length=1, max_length=120)
    # Optional at field level so a checklist can have no body; the kind rules
    # below require a body for journal/note.
    body_md: str = Field(default="", max_length=20_000)
    entry_date: date | None = None
    tags: list[str] = Field(default_factory=list)
    folder: str | None = None
    items: list[ChecklistItem] = Field(default_factory=list)
    mood: MoodKey | None = None
    pinned: bool = False

    @field_validator("title", "body_md")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("items")
    @classmethod
    def _clean_items(cls, items: list[ChecklistItem]) -> list[ChecklistItem]:
        """Drop blank-text rows and cap the count (blank rows are silent)."""
        cleaned = [item for item in items if item.text]
        if len(cleaned) > MAX_ITEMS:
            raise ValueError(f"Up to {MAX_ITEMS} items")
        return cleaned

    @field_validator("folder")
    @classmethod
    def _clean_folder(cls, folder: str | None) -> str | None:
        return normalize_folder(folder)

    @field_validator("tags")
    @classmethod
    def _clean_tags(cls, tags: list[str]) -> list[str]:
        """Normalize, drop empties, and de-dupe (preserving order)."""
        seen: dict[str, None] = {}
        for raw in tags:
            slug = normalize_tag(raw)
            if slug:
                seen.setdefault(slug, None)
        cleaned = list(seen)
        if len(cleaned) > MAX_TAGS:
            raise ValueError(f"Up to {MAX_TAGS} tags")
        return cleaned

    @model_validator(mode="after")
    def _enforce_kind_rules(self) -> "NoteBase":
        """Per-kind invariants.

        - journal: needs a date + a body; carries no checklist items.
        - note: text body required; no date/mood/items.
        - checklist: needs at least one item; body optional; no date/mood.
        """
        if self.kind == "journal":
            if self.entry_date is None:
                raise ValueError("Journal entries need a date")
            self.items = []
            if not self.body_md:
                raise ValueError("Write something first")
        elif self.kind == "checklist":
            self.entry_date = None
            self.mood = None
            if not self.items:
                raise ValueError("Add at least one item")
        else:  # plain note
            self.entry_date = None
            self.mood = None
            self.items = []
            if not self.body_md:
                raise ValueError("Write something first")
        return self


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    """Partial update (PATCH semantics).

    Every field is optional: omitted fields keep their current value, while an
    explicit ``null`` clears a nullable field (``entry_date`` / ``mood``).
    Cross-field rules and tag normalization are applied against the merged
    result in the route by re-validating through ``NoteBase``.
    """

    kind: NoteKind | None = None
    title: str | None = Field(default=None, min_length=1, max_length=120)
    # Empty allowed here (a checklist may clear its body); NoteBase enforces the
    # per-kind body requirement on the merged result.
    body_md: str | None = Field(default=None, max_length=20_000)
    entry_date: date | None = None
    tags: list[str] | None = None
    folder: str | None = None
    items: list[ChecklistItem] | None = None
    mood: MoodKey | None = None
    pinned: bool | None = None


class NoteRead(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class NoteSearchHit(NoteRead):
    """A note matched by full-text search, plus why it matched.

    ``rank`` is Postgres' relevance score (higher = better) and ``snippet`` is a
    ``ts_headline`` excerpt of the body with the matched terms wrapped in
    ``<mark>`` for the client to highlight.
    """

    rank: float
    snippet: str
