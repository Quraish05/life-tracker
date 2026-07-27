from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MealLog(Base):
    """One dish eaten in a slot on a given day.

    A meal references a :class:`~app.models.dish.Dish` from the user's library,
    but also snapshots ``dish_name`` at log time: if the dish is later deleted
    the FK is nulled (``ondelete="SET NULL"``) yet the meal stays readable — the
    day's history is preserved (an event/line-item pattern).
    """

    __tablename__ = "meal_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    log_date: Mapped[date] = mapped_column(Date, index=True)
    # breakfast | lunch | dinner | snack
    slot: Mapped[str] = mapped_column(String(16))
    # Live link to the library dish; nulled if that dish is deleted.
    dish_id: Mapped[int | None] = mapped_column(
        ForeignKey("dishes.id", ondelete="SET NULL"), default=None
    )
    # Snapshot of the dish name at log time, so history survives dish deletion.
    dish_name: Mapped[str] = mapped_column(String(120))
    # Optional free-text portion / note ("half plate", "2 rotis").
    note: Mapped[str | None] = mapped_column(String(200), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
