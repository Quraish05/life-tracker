"""Integration tests for the food route's new endpoints (against real Postgres).

The activity aggregation (count / top-slot / recent) is SQL, so it runs against
the ``db`` fixture. The endpoints are plain async functions taking the resolved
user + session, so we call them directly rather than through HTTP — the repo has
no auth'd test client, and the dependency wiring is FastAPI's to guarantee.
"""

from datetime import date

import pytest
from fastapi import HTTPException

from app.api.routes.food import (
    estimate_food_nutrition,
    get_food_activity,
)
from app.models.food import FoodItem
from app.models.meal_log import MealLog
from app.models.user import User
from app.schemas.food_ai import NutritionEstimate, NutritionEstimateRequest


async def _make_user(db, username: str = "alice") -> User:
    user = User(username=username, email=f"{username}@example.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


async def _make_food(db, user: User, name: str = "Shawarma bowl") -> FoodItem:
    food = FoodItem(user_id=user.id, name=name)
    db.add(food)
    await db.flush()
    return food


async def _log(db, user: User, food: FoodItem, slot: str, day: date) -> MealLog:
    meal = MealLog(
        user_id=user.id,
        log_date=day,
        slot=slot,
        food_id=food.id,
        food_name=food.name,
    )
    db.add(meal)
    await db.flush()
    return meal


# ---- activity ---------------------------------------------------------------


async def test_activity_counts_and_picks_top_slot(db):
    user = await _make_user(db)
    food = await _make_food(db, user)
    await _log(db, user, food, "lunch", date(2026, 7, 20))
    await _log(db, user, food, "lunch", date(2026, 7, 22))
    await _log(db, user, food, "dinner", date(2026, 7, 25))

    activity = await get_food_activity(food.id, user, db)

    assert activity.count == 3
    assert activity.top_slot == "lunch"


async def test_activity_recent_is_newest_first(db):
    user = await _make_user(db)
    food = await _make_food(db, user)
    await _log(db, user, food, "lunch", date(2026, 7, 20))
    newest = await _log(db, user, food, "lunch", date(2026, 7, 29))
    await _log(db, user, food, "lunch", date(2026, 7, 25))

    activity = await get_food_activity(food.id, user, db)

    assert activity.recent[0].id == newest.id
    assert [m.log_date for m in activity.recent] == [
        date(2026, 7, 29),
        date(2026, 7, 25),
        date(2026, 7, 20),
    ]


async def test_activity_empty_when_never_logged(db):
    user = await _make_user(db)
    food = await _make_food(db, user)

    activity = await get_food_activity(food.id, user, db)

    assert activity.count == 0
    assert activity.top_slot is None
    assert activity.recent == []


async def test_activity_ignores_other_users_logs(db):
    alice = await _make_user(db, "alice")
    bob = await _make_user(db, "bob")
    food = await _make_food(db, alice)
    await _log(db, alice, food, "lunch", date(2026, 7, 20))
    # Bob can't own a log against alice's food in practice, but guard the filter.
    bob_food = await _make_food(db, bob, "Bob's bowl")
    await _log(db, bob, bob_food, "dinner", date(2026, 7, 21))

    activity = await get_food_activity(food.id, alice, db)

    assert activity.count == 1
    assert activity.top_slot == "lunch"


async def test_activity_404_for_food_not_owned(db):
    alice = await _make_user(db, "alice")
    bob = await _make_user(db, "bob")
    alice_food = await _make_food(db, alice)

    with pytest.raises(HTTPException) as exc:
        await get_food_activity(alice_food.id, bob, db)
    assert exc.value.status_code == 404


# ---- estimate route quota wiring -------------------------------------------


async def test_estimate_returns_values_and_charges_quota(db, monkeypatch):
    user = await _make_user(db)
    before = user.ai_usage_count

    async def _fake_estimate(*, name, ingredients):
        return NutritionEstimate(calories=95, protein_g=0, carbs_g=25, fat_g=0), "test-model"

    monkeypatch.setattr(
        "app.api.routes.food.estimate_nutrition", _fake_estimate
    )

    result = await estimate_food_nutrition(
        NutritionEstimateRequest(name="Apple"), user, db
    )

    assert result.calories == 95
    assert result.model == "test-model"
    # A successful AI call charges exactly one credit against the free pool.
    assert user.ai_usage_count == before + 1
