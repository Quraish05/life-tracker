from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HealthGoal(Base):
    """A user's single health goal + profile that the AI summary reasons about.

    One row per user (``user_id`` is unique). The optional profile fields
    (weight, height, activity, timeframe) let the AI estimate a rough daily
    calorie/macro target; a bare ``goal_type`` still works, just less precisely.
    """

    __tablename__ = "health_goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    # lose_weight | gain_muscle | maintain | gain_weight | general_fitness
    goal_type: Mapped[str] = mapped_column(String(24))
    current_weight_kg: Mapped[float | None] = mapped_column(Float, default=None)
    target_weight_kg: Mapped[float | None] = mapped_column(Float, default=None)
    height_cm: Mapped[float | None] = mapped_column(Float, default=None)
    # sedentary | light | moderate | active | very_active
    activity_level: Mapped[str | None] = mapped_column(String(16), default=None)
    timeframe_weeks: Mapped[int | None] = mapped_column(Integer, default=None)
    note: Mapped[str | None] = mapped_column(String(300), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
