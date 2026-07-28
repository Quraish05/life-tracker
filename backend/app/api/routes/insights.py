from datetime import date

from fastapi import APIRouter
from sqlalchemy import select

from app.api.ai_errors import ai_errors_as_http
from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.models.daily_summary import DailySummaryRecord
from app.models.exercise_log import ExerciseLog
from app.models.health_goal import HealthGoal
from app.models.meal_log import MealLog
from app.schemas.health_ai import (
    DailySummaryRecordRead,
    DailySummaryResponse,
    DailySummarySave,
)
from app.services.daily_summary import summarize_day

router = APIRouter(prefix="/insights", tags=["insights"])

# Fields copied from the save payload onto a stored record.
_RECORD_FIELDS = (
    "calories_in",
    "calories_out",
    "target_calories",
    "assessment",
    "headline",
    "tip",
    "model",
)


@router.post(
    "/daily",
    response_model=DailySummaryResponse,
    summary="AI summary of a day's meals + workouts vs the user's goal",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def daily_summary(
    date: date, current_user: CurrentUser, db: DbSession
) -> DailySummaryResponse:
    """Estimate calories in/out for ``date`` and assess it against the goal.

    Aggregates the user's meals + exercises for the day and their health goal,
    then asks the AI for a short on-track summary. A day with nothing logged
    returns a ``no_data`` summary without an API call; a missing provider key
    surfaces as 503 (setup message) via ``ai_errors_as_http``.
    """
    meals = list(
        await db.scalars(
            select(MealLog).where(
                MealLog.user_id == current_user.id, MealLog.log_date == date
            )
        )
    )
    exercises = list(
        await db.scalars(
            select(ExerciseLog).where(
                ExerciseLog.user_id == current_user.id, ExerciseLog.log_date == date
            )
        )
    )
    goal = await db.scalar(
        select(HealthGoal).where(HealthGoal.user_id == current_user.id)
    )

    with ai_errors_as_http("Could not summarize your day right now. Please try again."):
        summary, model = await summarize_day(
            on_date=date, goal=goal, meals=meals, exercises=exercises
        )

    return DailySummaryResponse(model=model, summary=summary)


@router.put(
    "/summaries",
    response_model=DailySummaryRecordRead,
    summary="Save (upsert) a day's summary to the progress log",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def save_summary(
    payload: DailySummarySave, current_user: CurrentUser, db: DbSession
) -> DailySummaryRecord:
    """Persist a generated summary for its day, replacing any existing one."""
    record = await db.scalar(
        select(DailySummaryRecord).where(
            DailySummaryRecord.user_id == current_user.id,
            DailySummaryRecord.summary_date == payload.summary_date,
        )
    )
    data = payload.model_dump()

    if record is None:
        record = DailySummaryRecord(user_id=current_user.id, **data)
        db.add(record)
    else:
        for field in _RECORD_FIELDS:
            setattr(record, field, data[field])

    await db.commit()
    await db.refresh(record)
    return record


@router.get(
    "/summaries",
    response_model=list[DailySummaryRecordRead],
    summary="List saved summaries in a date range (for progress)",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def list_summaries(
    start: date, end: date, current_user: CurrentUser, db: DbSession
) -> list[DailySummaryRecord]:
    """Saved summaries with ``start <= summary_date <= end``, newest day first."""
    result = await db.scalars(
        select(DailySummaryRecord)
        .where(
            DailySummaryRecord.user_id == current_user.id,
            DailySummaryRecord.summary_date >= start,
            DailySummaryRecord.summary_date <= end,
        )
        .order_by(DailySummaryRecord.summary_date.desc())
    )
    return list(result)
