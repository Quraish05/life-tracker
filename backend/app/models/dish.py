from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Dish(Base):
    """A reusable food entity owned by a user — the meal library.

    A dish is defined once (name + optional markdown recipe + a list of
    ingredients) and later referenced by meal logs, macro estimation, and
    cross-links. Ingredients are stored as JSONB: a list of ``{name, amount}``
    objects where ``amount`` is free text (``"200g"``, ``"2 cups"``). Their
    shape is enforced at the API boundary by the Pydantic ``Ingredient`` schema.
    """

    __tablename__ = "dishes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    # Optional markdown recipe / method.
    recipe_md: Mapped[str | None] = mapped_column(Text, default=None)
    # List of {name, amount} objects; see the Ingredient schema.
    ingredients: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
