"""Request/response schemas for notes.

These mirror the frontend Zod schema in
`frontend/src/lib/validations/note.ts` so client and server agree on shape,
limits, and the journal-needs-a-date rule.
"""

import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

NoteKind = Literal["journal", "note"]
MoodKey = Literal["great", "good", "okay", "low", "rough"]

MAX_TAGS = 10


def normalize_tag(raw: str) -> str:
    """Slugify a raw tag so the same idea always groups together.

    Mirrors `normalizeTag` on the frontend: "#Work Stuff" -> "work-stuff".
    Returns "" if nothing usable remains.
    """
    slug = raw.strip().lower()
    slug = re.sub(r"^#+", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug[:24]


class NoteBase(BaseModel):
    kind: NoteKind
    title: str = Field(min_length=1, max_length=120)
    body_md: str = Field(min_length=1, max_length=20_000)
    entry_date: date | None = None
    tags: list[str] = Field(default_factory=list)
    mood: MoodKey | None = None
    pinned: bool = False

    @field_validator("title", "body_md")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()

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
        """Journal entries need a date; plain notes carry neither date nor mood."""
        if self.kind == "journal":
            if self.entry_date is None:
                raise ValueError("Journal entries need a date")
        else:
            self.entry_date = None
            self.mood = None
        return self


class NoteCreate(NoteBase):
    pass


class NoteUpdate(NoteBase):
    """Full replacement of an existing note (PUT semantics)."""


class NoteRead(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
