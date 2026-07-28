"""Request/response schemas for the user's health goal.

Mirrors the frontend Zod schema in `frontend/src/lib/validations/health-goal.ts`.
Only ``goal_type`` is required; the profile fields are optional and simply make
the AI daily-summary estimates more grounded.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

GoalType = Literal[
    "lose_weight", "gain_muscle", "maintain", "gain_weight", "general_fitness"
]
ActivityLevel = Literal["sedentary", "light", "moderate", "active", "very_active"]


class HealthGoalBase(BaseModel):
    goal_type: GoalType
    current_weight_kg: float | None = Field(default=None, ge=20, le=400)
    target_weight_kg: float | None = Field(default=None, ge=20, le=400)
    height_cm: float | None = Field(default=None, ge=50, le=260)
    activity_level: ActivityLevel | None = None
    timeframe_weeks: int | None = Field(default=None, ge=1, le=520)
    note: str | None = Field(default=None, max_length=300)

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class HealthGoalUpsert(HealthGoalBase):
    pass


class HealthGoalRead(HealthGoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
