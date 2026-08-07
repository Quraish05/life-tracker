"""Compute and store a user's "week in review".

Pure deterministic aggregation over what the user has logged — no AI, so it
never costs a credit. ``compute_recap`` reads the raw activity; ``generate_and_
store_recap`` upserts the single latest ``WeeklyRecap`` row for a user. Both the
scheduled Monday job and the on-demand "Refresh" go through here.

Stats are limited to what the schema can support *honestly*: meals carry no
calorie count and exercises no duration (both are free-text), so the recap
reports counts, active days, and a logging streak rather than inventing
kcal/minute totals.
"""

from collections import Counter
from datetime import date, timedelta
from typing import Any

from sqlalchemy import Date, and_, cast, func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise_log import ExerciseLog
from app.models.meal_log import MealLog
from app.models.note import Note
from app.models.weekly_recap import WeeklyRecap

# The recap window is the last 7 days (today inclusive). Streaks look back
# further so a streak longer than a week is still counted in full.
_WINDOW_DAYS = 7
_STREAK_LOOKBACK_DAYS = 60


def _streak_ending_today(activity_dates: set[date], today: date) -> int:
    """Count consecutive days with any activity, ending today."""
    streak = 0
    day = today
    while day in activity_dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


async def compute_recap(db: AsyncSession, user_id: int) -> tuple[dict[str, Any], date, date]:
    """Compute a user's recap stats. Returns ``(data, period_start, period_end)``."""
    today: date = await db.scalar(select(func.current_date()))
    window_start = today - timedelta(days=_WINDOW_DAYS - 1)
    lookback_start = today - timedelta(days=_STREAK_LOOKBACK_DAYS)

    meal_dates = list(
        await db.scalars(
            select(MealLog.log_date).where(
                MealLog.user_id == user_id, MealLog.log_date >= lookback_start
            )
        )
    )
    exercise_dates = list(
        await db.scalars(
            select(ExerciseLog.log_date).where(
                ExerciseLog.user_id == user_id, ExerciseLog.log_date >= lookback_start
            )
        )
    )
    # A journal entry's day is its entry_date when set, else the day it was created.
    journal_rows = list(
        await db.execute(
            select(
                func.coalesce(Note.entry_date, cast(Note.created_at, Date)).label("day"),
                Note.mood,
            ).where(
                Note.user_id == user_id,
                Note.kind == "journal",
                or_(
                    Note.entry_date >= lookback_start,
                    and_(Note.entry_date.is_(None), Note.created_at >= lookback_start),
                ),
            )
        )
    )

    activity_dates = set(meal_dates) | set(exercise_dates) | {r.day for r in journal_rows}

    def in_window(d: date) -> bool:
        return d >= window_start

    moods_this_week = [r.mood for r in journal_rows if in_window(r.day) and r.mood]
    top_mood = Counter(moods_this_week).most_common(1)[0][0] if moods_this_week else None

    data: dict[str, Any] = {
        "streak_days": _streak_ending_today(activity_dates, today),
        "active_days": len({d for d in activity_dates if in_window(d)}),
        "meals_logged": sum(1 for d in meal_dates if in_window(d)),
        "workouts_logged": sum(1 for d in exercise_dates if in_window(d)),
        "journal_entries": sum(1 for r in journal_rows if in_window(r.day)),
        "top_mood": top_mood,
    }
    return data, window_start, today


async def generate_and_store_recap(db: AsyncSession, user_id: int) -> WeeklyRecap:
    """Compute a user's recap and upsert their single latest ``WeeklyRecap`` row."""
    data, period_start, period_end = await compute_recap(db, user_id)
    stmt = (
        pg_insert(WeeklyRecap)
        .values(
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
            data=data,
        )
        .on_conflict_do_update(
            index_elements=["user_id"],
            set_={
                "period_start": period_start,
                "period_end": period_end,
                "data": data,
                "generated_at": func.now(),
            },
        )
    )
    await db.execute(stmt)
    await db.commit()
    return await db.scalar(select(WeeklyRecap).where(WeeklyRecap.user_id == user_id))
