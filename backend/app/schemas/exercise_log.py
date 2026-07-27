"""Request/response schemas for exercise logs.

Mirrors the frontend Zod schema in `frontend/src/lib/validations/exercise.ts`.
An exercise log is a name plus an optional free-text note, pinned to a day.
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExerciseLogBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    note: str | None = Field(default=None, max_length=120)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        # Strip before length checks so a whitespace-only name fails min_length.
        return value.strip() if isinstance(value, str) else value

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ExerciseLogCreate(ExerciseLogBase):
    log_date: date


class ExerciseLogUpdate(BaseModel):
    """Partial update (PATCH semantics)."""

    name: str | None = Field(default=None, min_length=1, max_length=80)
    note: str | None = Field(default=None, max_length=120)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class ExerciseLogRead(ExerciseLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    log_date: date
    created_at: datetime
