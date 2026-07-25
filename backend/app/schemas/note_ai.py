"""Schemas for AI-assisted note features.

Today this is the *follow-up extractor*: it reads a note or journal entry and
proposes reminders the writer implicitly committed to. The output is a strict,
schema-constrained shape (no free-form parsing) and every item is a *proposal* —
nothing is created until the user accepts it.

These models double as CCAF study material: they demonstrate structured output
(Domain 4.3) with a nullable field to prevent hallucination (`remind_at`), enum
fields with an ``unclear`` escape hatch (`kind`), and a confidence score used
for human-review routing (Domain 5.5).
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# What the model may say a follow-up is. "unclear" is the deliberate escape
# hatch for an actionable item whose type it can't pin down — better an honest
# "unclear" than a confident wrong guess (CCAF 4.3, enum + "other"/"unclear").
FollowUpKind = Literal["task", "event", "unclear"]

# Drives human-review routing: the UI can surface low-confidence items more
# cautiously. Self-reported confidence is only a *routing* hint, never an
# auto-accept gate (CCAF 5.5 — LLM confidence is not calibrated on its own).
Confidence = Literal["high", "medium", "low"]


class FollowUp(BaseModel):
    """One proposed follow-up extracted from a note."""

    title: str = Field(min_length=1, max_length=120)
    # Nullable on purpose: if the entry states no time, the model must return
    # null rather than inventing one. The user picks a time on accept.
    remind_at: datetime | None = None
    kind: FollowUpKind = "unclear"
    confidence: Confidence = "medium"
    # A short justification, shown to the user so they can judge the proposal.
    reason: str = Field(max_length=280)


class FollowUpExtraction(BaseModel):
    """The model's full structured answer — the object we validate against."""

    follow_ups: list[FollowUp] = Field(default_factory=list)


class FollowUpSuggestionsResponse(BaseModel):
    """API response: the source note plus the proposed follow-ups."""

    model_config = ConfigDict(from_attributes=True)

    note_id: int
    model: str
    suggestions: list[FollowUp]


# --- Tag suggestion -------------------------------------------------------
# A second AI note feature: read an entry's text and propose topic tags. Unlike
# follow-ups (which become separate reminders), a tag just fills the note's own
# `tags` field — so this is a lighter, approve-by-tapping flow with no entities
# created. Same structured-output discipline (CCAF 4.3): a strict shape, every
# tag carrying a one-line reason so the user can judge it.


class TagSuggestion(BaseModel):
    """One proposed topic tag for a note."""

    # A hashtag-style slug the client can drop straight into the tag field. The
    # note's own tag normalization is applied again on save as defense-in-depth.
    tag: str = Field(min_length=1, max_length=40)
    # A short justification, shown (e.g. as a tooltip) so the tag isn't opaque.
    reason: str = Field(max_length=200)


class TagSuggestionExtraction(BaseModel):
    """The model's full structured answer — the object we validate against."""

    tags: list[TagSuggestion] = Field(default_factory=list)


class TagSuggestionRequest(BaseModel):
    """Request body: the *draft* text to tag, sent straight from the editor.

    Content-in-body (rather than a saved note id) so suggestions always reflect
    what the user is currently writing, and work on unsaved entries.
    """

    title: str = ""
    body_md: str = ""


class TagSuggestionsResponse(BaseModel):
    """API response: the proposed tags plus which model produced them."""

    model: str
    suggestions: list[TagSuggestion]
