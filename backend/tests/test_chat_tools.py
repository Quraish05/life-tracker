"""Unit tests for the chat assistant's tool executors (against real Postgres).

The executors are the write/read surface the model drives; the streaming loop
itself is thin glue over the Anthropic SDK, so we test the tools directly with
the ``db`` fixture rather than mocking a model.
"""

from datetime import date
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from app.models.exercise_log import ExerciseLog
from app.models.food import FoodItem
from app.models.meal_log import MealLog
from app.models.reminder import Reminder
from app.models.user import User
from app.services.chat_tools import execute_tool

_TZ = ZoneInfo("UTC")
_TODAY = date(2026, 8, 1)


async def _make_user(db, username: str = "alice") -> User:
    user = User(username=username, email=f"{username}@example.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


async def _run(name, tool_input, user, db):
    return await execute_tool(name, tool_input, user=user, db=db, tz=_TZ, today=_TODAY)


# ---- log_exercise -----------------------------------------------------------


async def test_log_exercise_creates_row(db):
    user = await _make_user(db)
    outcome = await _run("log_exercise", {"name": "Morning walk", "note": "42 min"}, user, db)

    assert outcome.ok
    ex = await db.scalar(select(ExerciseLog).where(ExerciseLog.user_id == user.id))
    assert ex.name == "Morning walk"
    assert ex.note == "42 min"
    assert ex.log_date == _TODAY


async def test_log_exercise_requires_name(db):
    user = await _make_user(db)
    outcome = await _run("log_exercise", {"name": "   "}, user, db)
    assert not outcome.ok


# ---- log_meal ---------------------------------------------------------------


async def test_log_meal_creates_food_and_meal(db):
    user = await _make_user(db)
    outcome = await _run(
        "log_meal", {"food_name": "Oatmeal", "slot": "breakfast", "note": "1 bowl"}, user, db
    )

    assert outcome.ok
    food = await db.scalar(select(FoodItem).where(FoodItem.user_id == user.id))
    assert food.name == "Oatmeal"
    meal = await db.scalar(select(MealLog).where(MealLog.user_id == user.id))
    assert meal.food_id == food.id
    assert meal.slot == "breakfast"
    assert meal.note == "1 bowl"


async def test_log_meal_reuses_existing_food_case_insensitively(db):
    user = await _make_user(db)
    await _run("log_meal", {"food_name": "Oatmeal", "slot": "breakfast"}, user, db)
    await _run("log_meal", {"food_name": "oatmeal", "slot": "lunch"}, user, db)

    food_count = await db.scalar(
        select(func.count()).select_from(FoodItem).where(FoodItem.user_id == user.id)
    )
    meal_count = await db.scalar(
        select(func.count()).select_from(MealLog).where(MealLog.user_id == user.id)
    )
    assert food_count == 1  # one food reused across both logs
    assert meal_count == 2


async def test_log_meal_rejects_bad_slot(db):
    user = await _make_user(db)
    outcome = await _run("log_meal", {"food_name": "Apple", "slot": "brunch"}, user, db)
    assert not outcome.ok


# ---- create_reminder --------------------------------------------------------


async def test_create_reminder_parses_offset_datetime(db):
    user = await _make_user(db)
    outcome = await _run(
        "create_reminder",
        {"title": "Gym", "remind_at": "2026-08-02T18:00:00+00:00"},
        user,
        db,
    )

    assert outcome.ok
    reminder = await db.scalar(select(Reminder).where(Reminder.user_id == user.id))
    assert reminder.title == "Gym"
    assert reminder.remind_at.tzinfo is not None


async def test_create_reminder_rejects_garbage_datetime(db):
    user = await _make_user(db)
    outcome = await _run("create_reminder", {"title": "Gym", "remind_at": "soon"}, user, db)
    assert not outcome.ok


# ---- query_day --------------------------------------------------------------


async def test_query_day_summarizes_meals_and_exercises(db):
    user = await _make_user(db)
    await _run("log_meal", {"food_name": "Oatmeal", "slot": "breakfast"}, user, db)
    await _run("log_exercise", {"name": "Run"}, user, db)

    outcome = await _run("query_day", {}, user, db)

    assert outcome.ok
    assert "Oatmeal" in outcome.result
    assert "Run" in outcome.result


async def test_query_day_empty(db):
    user = await _make_user(db)
    outcome = await _run("query_day", {"date": "2026-07-04"}, user, db)
    assert outcome.ok
    assert "Nothing logged" in outcome.result


# ---- dispatch guardrails ----------------------------------------------------


async def test_unknown_tool_is_not_ok(db):
    user = await _make_user(db)
    outcome = await _run("delete_everything", {}, user, db)
    assert not outcome.ok
