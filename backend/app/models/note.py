from datetime import date, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    Computed,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Note(Base):
    """A journal entry or free-standing note owned by a user.

    Mirrors the frontend `Note` shape (see `frontend/src/lib/notes.ts`):
    one table, distinguished by `kind` (``journal`` | ``note``). Journal
    entries carry an `entry_date` and optional `mood`; plain notes don't.
    """

    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(120))
    body_md: Mapped[str] = mapped_column(Text)
    # Present only for journal entries.
    entry_date: Mapped[date | None] = mapped_column(Date, default=None)
    # Hashtag-style slugs, stored normalized and de-duped.
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(24)), default=list)
    # Optional mood, only meaningful for journal entries.
    mood: Mapped[str | None] = mapped_column(String(16), default=None)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Full-text index maintained by Postgres itself (a STORED generated column):
    # title weighted 'A' above body 'B', so a title hit outranks a body hit. The
    # 2-arg to_tsvector('english', ...) is IMMUTABLE, which a generated column
    # requires. Deferred so ordinary note queries don't haul the vector back.
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed(
            "setweight(to_tsvector('english', coalesce(title, '')), 'A') || "
            "setweight(to_tsvector('english', coalesce(body_md, '')), 'B')",
            persisted=True,
        ),
        nullable=True,
        deferred=True,
    )

    __table_args__ = (
        # GIN is the index type that makes @@ full-text matches fast.
        Index("ix_notes_search_vector", "search_vector", postgresql_using="gin"),
    )
