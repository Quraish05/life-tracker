from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Ingredient(Base):
    """A reusable pantry ingredient owned by a user.

    Just a name plus a free-text "usual amount" (``"40 g"``, ``"1 tsp"``). The
    pantry is a convenience library: ingredients are filed here and sprinkled
    onto :class:`~app.models.food.FoodItem` records (whose own ingredient lines
    stay embedded as JSONB). Nutrition is estimated at the food level, so an
    ingredient carries no macros of its own.
    """

    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(80))
    # Free-text default portion, e.g. "40 g". Empty string when unset.
    default_amount: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
