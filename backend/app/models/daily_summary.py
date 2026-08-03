from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DailySummaryRecord(Base):
    """A saved day summary — the user's own text, optionally with AI stats.

    One row per user per day (``user_id`` + ``summary_date`` unique). ``note`` is
    the editable free-text summary (typed by hand, or AI-drafted then kept/edited)
    and is the primary field. The structured calorie/assessment fields are a
    *snapshot* filled in only when the summary was AI-generated — all nullable, so
    a hand-typed note-only summary is valid. Re-saving a day replaces the row.
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
    # The editable free-text summary — the star of the record.
    note: Mapped[str | None] = mapped_column(Text, default=None)
    # AI snapshot fields — populated only on an AI-generated summary, else null.
    calories_in: Mapped[int | None] = mapped_column(Integer, default=None)
    calories_out: Mapped[int | None] = mapped_column(Integer, default=None)
    target_calories: Mapped[int | None] = mapped_column(Integer, default=None)
    # on_track | off_track | no_data
    assessment: Mapped[str | None] = mapped_column(String(16), default=None)
    headline: Mapped[str | None] = mapped_column(String(200), default=None)
    tip: Mapped[str | None] = mapped_column(String(200), default=None)
    # Which model produced the AI snapshot, for transparency.
    model: Mapped[str | None] = mapped_column(String(64), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
