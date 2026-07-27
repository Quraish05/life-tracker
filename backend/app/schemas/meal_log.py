"""Request/response schemas for meal logs.

A meal log records one dish eaten in a slot on a day. The client sends a
``dish_id``; the server snapshots ``dish_name`` from the owned dish at create
time (see the meals route), so these schemas never take a client-supplied name.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MealSlot = Literal["breakfast", "lunch", "dinner", "snack"]


class MealLogCreate(BaseModel):
    log_date: date
    slot: MealSlot
    dish_id: int
    note: str | None = Field(default=None, max_length=200)

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class MealLogUpdate(BaseModel):
    """Partial update (PATCH semantics) — the dish itself isn't reassigned here."""

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
    # Null once the source dish is deleted; dish_name still describes the meal.
    dish_id: int | None
    dish_name: str
    note: str | None
    created_at: datetime
