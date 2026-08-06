from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class JournalInsight(Base):
    """A saved "Ask my journal" answer — a *finding* the user chose to keep.

    A RAG answer is otherwise ephemeral; saving one persists it as a finding on the
    Patterns page: the ``answer`` is the claim, ``citations`` are its evidence, and
    ``helpful`` records the user's "was this true for you?" vote. Like
    ``DailySummaryRecord``, the AI-derived fields are stored as a self-contained
    **snapshot** — ``citations`` copies each source's title/date/snippet rather than
    FK-linking a note, so a finding still reads correctly after the underlying entry
    is edited or deleted.
    """

    __tablename__ = "journal_insights"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    question: Mapped[str] = mapped_column(String(500))
    answer: Mapped[str] = mapped_column(Text)
    # Snapshot of the citations shown when saved: a list of
    # {"note_id": int, "entry_date": str|None, "title": str, "snippet": str}.
    citations: Mapped[list[dict]] = mapped_column(
        JSONB, default=list, server_default="[]"
    )
    # Which model produced the answer, for the "how this was computed" footer.
    model: Mapped[str | None] = mapped_column(String(64), default=None)
    # The "was this true for you?" vote: None = unanswered, True = "that's me",
    # False = "off base".
    helpful: Mapped[bool | None] = mapped_column(Boolean, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
