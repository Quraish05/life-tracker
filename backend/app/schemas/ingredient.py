"""Request/response schemas for pantry ingredients.

An ingredient is a reusable pantry entry: a name plus a free-text "usual
amount". No nutrition — macros are estimated at the food level.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class IngredientBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    default_amount: str = Field(default="", max_length=40)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        # Strip before length checks so a whitespace-only name fails min_length.
        return value.strip() if isinstance(value, str) else value

    @field_validator("default_amount")
    @classmethod
    def _strip_amount(cls, value: str) -> str:
        return value.strip()


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(BaseModel):
    """Partial update (PATCH semantics) — omitted fields keep their value."""

    name: str | None = Field(default=None, min_length=1, max_length=80)
    default_amount: str | None = Field(default=None, max_length=40)


class IngredientRead(IngredientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
