from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class WeeklyRecapData(BaseModel):
    """The deterministic stats blob — shape mirrors weekly_recap.compute_recap."""

    streak_days: int
    active_days: int
    meals_logged: int
    workouts_logged: int
    journal_entries: int
    top_mood: str | None = None


class WeeklyRecapRead(BaseModel):
    """A user's latest week-in-review."""

    model_config = ConfigDict(from_attributes=True)

    period_start: date
    period_end: date
    generated_at: datetime
    data: WeeklyRecapData


class RecapJobStatus(BaseModel):
    """A pointer to an in-flight (or finished) recap-refresh job, for polling."""

    job_id: int
    status: str  # queued | running | done | failed
