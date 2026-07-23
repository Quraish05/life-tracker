from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Reminder(Base):
    """A time-based nudge owned by a user.

    A reminder can stand alone (just a title) or point at another record —
    a note, workout, or meal — via a *soft* reference (`target_type` +
    `target_id`). It's soft on purpose: one reminder may target any of
    several tables, so the database can't enforce a foreign key on the
    target the way `user_id` is enforced against `users`.
    """

    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str | None] = mapped_column(String(500), default=None)
    # When to fire. Indexed because the "what's due?" query filters on it.
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    # Soft reference to what this reminder is about: target_type names the
    # table ("note" | "workout" | "meal"), target_id the row. Both null =>
    # a standalone reminder. No FK — one column can't point at three tables.
    target_type: Mapped[str | None] = mapped_column(String(16), default=None)
    target_id: Mapped[int | None] = mapped_column(Integer, default=None)
    # Null until the reminder has been delivered to the user.
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
