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
    """The strict structured output the model returns for a day.

    ``narrative`` is the star for the log page's editable summary: a short prose
    paragraph the user can keep or rewrite. The calorie/assessment fields ride
    along so an AI-generated summary can also snapshot the numbers.
    """

    calories_in: int = Field(ge=0, description="Estimated kcal eaten.")
    calories_out: int = Field(ge=0, description="Estimated kcal burned by exercise.")
    target_calories: int | None = Field(
        default=None, description="Rough daily target for the goal, or null."
    )
    assessment: Assessment
    headline: str = Field(max_length=200)
    tip: str = Field(max_length=200)
    narrative: str = Field(
        max_length=1200, description="A short prose summary of the day (2–4 sentences)."
    )


class DailySummaryResponse(BaseModel):
    model: str
    summary: DailySummary


# Free-text note has room for a real reflection but stays bounded.
NOTE_MAX = 4000


class DailySummarySave(BaseModel):
    """Payload to persist a day's summary.

    ``note`` is the editable free text (typed or AI-drafted); the structured
    fields are an optional AI snapshot, present only when the note came from a
    generation. A hand-typed summary sends ``note`` alone.
    """

    summary_date: date
    note: str | None = Field(default=None, max_length=NOTE_MAX)
    calories_in: int | None = Field(default=None, ge=0)
    calories_out: int | None = Field(default=None, ge=0)
    target_calories: int | None = Field(default=None)
    assessment: Assessment | None = None
    headline: str | None = Field(default=None, max_length=200)
    tip: str | None = Field(default=None, max_length=200)
    model: str | None = Field(default=None, max_length=64)


class DailySummaryRecordRead(BaseModel):
    """A saved summary row, as returned to the client."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    summary_date: date
    note: str | None
    calories_in: int | None
    calories_out: int | None
    target_calories: int | None
    assessment: Assessment | None
    headline: str | None
    tip: str | None
    model: str | None
    created_at: datetime
    updated_at: datetime
