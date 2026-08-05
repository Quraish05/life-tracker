"""Schemas for the "Ask my journal" RAG feature."""

from datetime import date

from pydantic import BaseModel, Field


class AskJournalRequest(BaseModel):
    """A natural-language question about the user's journal."""

    question: str = Field(min_length=3, max_length=500)


class Citation(BaseModel):
    """A journal entry the answer drew from — rendered as a source chip."""

    note_id: int
    entry_date: date | None = None
    title: str
    snippet: str


class AskJournalAnswer(BaseModel):
    """The model's structured output: the prose answer plus which excerpts it used.

    ``used_note_ids`` lets us show precise citations — only the entries the model
    actually leaned on, not every retrieved candidate. Empty when the excerpts
    don't cover the question.
    """

    answer: str
    used_note_ids: list[int] = Field(default_factory=list)


class AskJournalResponse(BaseModel):
    """What the endpoint returns: the answer, its citations, and the model used."""

    answer: str
    citations: list[Citation]
    model: str
