"""Schemas for the AI daily-summary feature.

``DailySummary`` is the strict structured output the model must return; the route
wraps it in ``DailySummaryResponse`` (adding the model name for transparency),
mirroring the note-AI response shape.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Assessment = Literal["on_track", "off_track", "no_data"]


class DailySummary(BaseModel):
    calories_in: int = Field(ge=0, description="Estimated kcal eaten.")
    calories_out: int = Field(ge=0, description="Estimated kcal burned by exercise.")
    target_calories: int | None = Field(
        default=None, description="Rough daily target for the goal, or null."
    )
    assessment: Assessment
    headline: str = Field(max_length=200)
    tip: str = Field(max_length=200)


class DailySummaryResponse(BaseModel):
    model: str
    summary: DailySummary


class DailySummarySave(DailySummary):
    """Payload to persist a generated summary to the progress log."""

    summary_date: date
    model: str = Field(max_length=64)


class DailySummaryRecordRead(DailySummary):
    """A saved summary row, as returned to the client."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    summary_date: date
    model: str
    created_at: datetime
    updated_at: datetime
