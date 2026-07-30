"""Request/response schemas for meal logs.

A meal log records one food eaten in a slot on a day. The client sends a
``food_id``; the server snapshots ``food_name`` from the owned food at create
time (see the meals route), so these schemas never take a client-supplied name.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MealSlot = Literal["breakfast", "lunch", "dinner", "snack"]


class MealLogCreate(BaseModel):
    log_date: date
    slot: MealSlot
    food_id: int
    note: str | None = Field(default=None, max_length=200)

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class MealLogUpdate(BaseModel):
    """Partial update (PATCH semantics) — the food itself isn't reassigned here."""

    slot: MealSlot | None = None
    note: str | None = Field(default=None, max_length=200)

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class MealLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    log_date: date
    slot: MealSlot
    # Null once the source food is deleted; food_name still describes the meal.
    food_id: int | None
    food_name: str
    note: str | None
    created_at: datetime
