"""Tests for the deterministic week-in-review aggregation.

Compute logic is SQL + Python over real rows, so it runs against the ``db``
fixture. The recap uses the database's ``current_date()``; tests anchor their
data to ``date.today()``, which matches on a single-machine test run.
"""

from datetime import date, timedelta

from sqlalchemy import func, select

from app.models.exercise_log import ExerciseLog
from app.models.meal_log import MealLog
from app.models.note import Note
from app.models.user import User
from app.models.weekly_recap import WeeklyRecap
from app.services.weekly_recap import compute_recap, generate_and_store_recap


async def _make_user(db, username: str = "recapper") -> User:
    user = User(username=username, email=f"{username}@example.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


async def test_recap_is_zeroed_for_a_user_with_no_activity(db):
    user = await _make_user(db)
    data, start, end = await compute_recap(db, user.id)
    assert data == {
        "streak_days": 0,
        "active_days": 0,
        "meals_logged": 0,
        "workouts_logged": 0,
        "journal_entries": 0,
        "top_mood": None,
    }
    assert (end - start).days == 6  # 7-day inclusive window


async def test_recap_counts_streak_and_top_mood(db):
    user = await _make_user(db)
    today = date.today()
    yesterday = today - timedelta(days=1)
    long_ago = today - timedelta(days=10)  # outside the 7-day window

    db.add_all(
        [
            MealLog(user_id=user.id, log_date=today, slot="lunch", food_name="Bowl"),
            MealLog(user_id=user.id, log_date=yesterday, slot="dinner", food_name="Curry"),
            MealLog(user_id=user.id, log_date=long_ago, slot="lunch", food_name="Old"),
            ExerciseLog(user_id=user.id, log_date=today, name="Run"),
            Note(user_id=user.id, kind="journal", title="A", body_md="x",
                 entry_date=today, mood="great"),
            Note(user_id=user.id, kind="journal", title="B", body_md="y",
                 entry_date=yesterday, mood="great"),
        ]
    )
    await db.flush()

    data, _start, _end = await compute_recap(db, user.id)
    assert data["meals_logged"] == 2  # long_ago meal excluded
    assert data["workouts_logged"] == 1
    assert data["journal_entries"] == 2
    assert data["active_days"] == 2  # today + yesterday
    assert data["streak_days"] == 2  # today and yesterday both active, ending today
    assert data["top_mood"] == "great"


async def test_generate_and_store_recap_upserts_one_row(db):
    user = await _make_user(db)
    first = await generate_and_store_recap(db, user.id)
    second = await generate_and_store_recap(db, user.id)

    assert first.id == second.id  # same row, upserted in place
    count = await db.scalar(
        select(func.count()).select_from(WeeklyRecap).where(WeeklyRecap.user_id == user.id)
    )
    assert count == 1
