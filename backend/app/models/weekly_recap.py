from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WeeklyRecap(Base):
    """The latest precomputed "week in review" for a user.

    One row per user (``user_id`` is unique): each generation *upserts* it, so
    the Today page can read the most recent recap instantly without recomputing.
    It's produced two ways, both via the job runner — a scheduled Monday job
    that refreshes every user's recap, and an on-demand "Refresh" that enqueues a
    job for just one user. The stats themselves are pure deterministic
    aggregation (no AI), so refreshing never costs an AI credit.
    """

    __tablename__ = "weekly_recaps"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Unique so a generation upserts the single latest recap for the user.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    # The 7-day window this recap covers (inclusive).
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    # The computed stats blob — shape owned by app/services/weekly_recap.py.
    data: Mapped[dict[str, Any]] = mapped_column(JSONB)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
