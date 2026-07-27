from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExerciseLog(Base):
    """One exercise done on a given day — a simple name plus an optional note.

    A day's workout is just the set of exercise logs sharing a ``log_date``;
    there's no routine/template in this slice (see the build plan's D3).
    """

    __tablename__ = "exercise_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    log_date: Mapped[date] = mapped_column(Date, index=True)
    name: Mapped[str] = mapped_column(String(80))
    # Optional free-text detail, e.g. "3×12 @ 20kg" or "30 min".
    note: Mapped[str | None] = mapped_column(String(120), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
