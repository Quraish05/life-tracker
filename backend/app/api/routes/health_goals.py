from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.models.health_goal import HealthGoal
from app.schemas.health_goal import HealthGoalRead, HealthGoalUpsert

router = APIRouter(prefix="/health-goal", tags=["health"])

# The editable fields, used to apply an upsert onto the existing row.
_GOAL_FIELDS = (
    "goal_type",
    "current_weight_kg",
    "target_weight_kg",
    "height_cm",
    "activity_level",
    "timeframe_weeks",
    "note",
)


async def _get_goal(user: CurrentUser, db: DbSession) -> HealthGoal | None:
    """The user's single health goal, or None if they haven't set one."""
    return await db.scalar(
        select(HealthGoal).where(HealthGoal.user_id == user.id)
    )


@router.get(
    "",
    response_model=HealthGoalRead | None,
    summary="Get the current user's health goal (null if unset)",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def get_health_goal(current_user: CurrentUser, db: DbSession) -> HealthGoal | None:
    """Return the user's goal, or ``null`` when none has been set yet."""
    return await _get_goal(current_user, db)


@router.put(
    "",
    response_model=HealthGoalRead,
    summary="Create or replace the current user's health goal",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def upsert_health_goal(
    payload: HealthGoalUpsert, current_user: CurrentUser, db: DbSession
) -> HealthGoal:
    """Set the user's goal — updates the existing one in place, or creates it."""
    goal = await _get_goal(current_user, db)
    data = payload.model_dump()

    if goal is None:
        goal = HealthGoal(user_id=current_user.id, **data)
        db.add(goal)
    else:
        for field in _GOAL_FIELDS:
            setattr(goal, field, data[field])

    await db.commit()
    await db.refresh(goal)
    return goal
