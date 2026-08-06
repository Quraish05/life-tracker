"""Schemas for saved journal insights — kept "Ask my journal" answers (Patterns)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.journal_qa import Citation


class JournalInsightCreate(BaseModel):
    """Persist an already-generated RAG answer as a finding.

    The client sends the answer it's holding (from ``POST /journal/ask``); saving
    is pure persistence — no model call, no AI credit.
    """

    question: str = Field(min_length=3, max_length=500)
    answer: str = Field(min_length=1)
    citations: list[Citation] = Field(default_factory=list)
    model: str | None = None


class JournalInsightVote(BaseModel):
    """The "was this true for you?" vote — None clears it."""

    helpful: bool | None = None


class JournalInsightRead(BaseModel):
    """A saved finding as returned to the Patterns page."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    answer: str
    citations: list[Citation]
    model: str | None = None
    helpful: bool | None = None
    created_at: datetime
