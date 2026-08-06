"""Goal Evaluator — no-data short-circuits are free, real evals charge one credit.

``generate_structured`` is faked (monkeypatched as imported into the service), so
the tests assert the *wiring*: no goal / nothing-logged make no model call and
cost no credit; a real evaluation charges exactly one; and the scope selects the
right date window.
"""

from datetime import date, timedelta

from app.api.routes.health_goals import evaluate_health_goal
from app.models.food import FoodItem
from app.models.health_goal import HealthGoal
from app.models.meal_log import MealLog
from app.models.user import User
from app.schemas.goal_eval import GoalEvaluation, GoalSignal
from app.services import goal_evaluator

TODAY = date(2026, 8, 6)


async def _user(db, name="goal") -> User:
    user = User(username=name, email=f"{name}@x.com", hashed_password="x")
    db.add(user)
    await db.flush()
    return user


async def _goal(db, user) -> HealthGoal:
    goal = HealthGoal(
        user_id=user.id, goal_type="lose_weight",
        current_weight_kg=76.8, target_weight_kg=74.4, timeframe_weeks=12,
    )
    db.add(goal)
    await db.flush()
    return goal


async def _food(db, user, calories=500, protein=30) -> FoodItem:
    food = FoodItem(user_id=user.id, name="Test meal", calories=calories, protein_g=protein)
    db.add(food)
    await db.flush()
    return food


async def _meal(db, user, food, on: date, slot="lunch") -> MealLog:
    meal = MealLog(
        user_id=user.id, log_date=on, slot=slot, food_id=food.id, food_name=food.name
    )
    db.add(meal)
    await db.flush()
    return meal


def _fake_eval(monkeypatch, *, score=78):
    async def gen(**kwargs):
        return (
            GoalEvaluation(
                alignment_score=score, verdict="On pace, just.",
                readout="You're tracking close to plan.",
                helping=[GoalSignal(emoji="💪", text="Four run days", value="+3 wks")],
                hurting=[], adjustment="Add a protein-rich snack.",
            ),
            "fake-model",
        )

    monkeypatch.setattr(goal_evaluator, "generate_structured", gen)


async def test_no_goal_is_free(db, monkeypatch):
    user = await _user(db, "nogoal")
    result = await goal_evaluator.evaluate_goal(db, user, "week", today=TODAY)
    assert result.used_model is False
    assert result.evaluation.alignment_score == 0


async def test_goal_but_nothing_logged_is_free(db, monkeypatch):
    user = await _user(db, "empty")
    await _goal(db, user)
    result = await goal_evaluator.evaluate_goal(db, user, "week", today=TODAY)
    assert result.used_model is False


async def test_real_evaluation_uses_model(db, monkeypatch):
    user = await _user(db, "real")
    await _goal(db, user)
    food = await _food(db, user)
    await _meal(db, user, food, on=TODAY)
    _fake_eval(monkeypatch)

    result = await goal_evaluator.evaluate_goal(db, user, "today", today=TODAY)
    assert result.used_model is True
    assert result.model == "fake-model"
    assert result.evaluation.alignment_score == 78


async def test_scope_selects_window(db, monkeypatch):
    """A meal 3 days ago is outside 'today' but inside 'week'."""
    user = await _user(db, "window")
    await _goal(db, user)
    food = await _food(db, user)
    await _meal(db, user, food, on=TODAY - timedelta(days=3))
    _fake_eval(monkeypatch)

    today_only = await goal_evaluator.evaluate_goal(db, user, "today", today=TODAY)
    assert today_only.used_model is False  # nothing logged *today*

    week = await goal_evaluator.evaluate_goal(db, user, "week", today=TODAY)
    assert week.used_model is True  # the 3-days-ago meal is in the 7-day window


async def test_route_charges_one_credit_on_real_eval(db, monkeypatch):
    user = await _user(db, "charge")
    await _goal(db, user)
    food = await _food(db, user)
    await _meal(db, user, food, on=date.today())  # route uses date.today()
    _fake_eval(monkeypatch)

    before = user.ai_usage_count
    resp = await evaluate_health_goal(user, db, scope="week")
    assert resp.evaluation.alignment_score == 78
    assert resp.scope == "week"
    assert user.ai_usage_count == before + 1


async def test_route_no_charge_on_no_data(db, monkeypatch):
    user = await _user(db, "free")  # no goal → no-data path
    before = user.ai_usage_count
    resp = await evaluate_health_goal(user, db, scope="week")
    assert resp.evaluation.alignment_score == 0
    assert user.ai_usage_count == before  # unchanged
