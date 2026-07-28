from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DailySummaryRecord(Base):
    """A saved snapshot of a day's AI summary, for progress tracking.

    One row per user per day (``user_id`` + ``summary_date`` unique). The user
    generates a summary on demand and explicitly *saves* it here; re-saving a day
    replaces the row. Values are a historical snapshot — they don't change if the
    day's meals/workouts are edited later.
    """

    __tablename__ = "daily_summaries"
    __table_args__ = (
        UniqueConstraint("user_id", "summary_date", name="uq_daily_summary_user_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    summary_date: Mapped[date] = mapped_column(Date, index=True)
    calories_in: Mapped[int] = mapped_column(Integer)
    calories_out: Mapped[int] = mapped_column(Integer)
    target_calories: Mapped[int | None] = mapped_column(Integer, default=None)
    # on_track | off_track | no_data
    assessment: Mapped[str] = mapped_column(String(16))
    headline: Mapped[str] = mapped_column(String(200))
    tip: Mapped[str] = mapped_column(String(200))
    # Which model produced it, for transparency.
    model: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
