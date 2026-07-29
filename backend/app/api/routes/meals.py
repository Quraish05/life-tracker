from datetime import date

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import case, select

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.api.responses import not_found_response
from app.models.dish import Dish
from app.models.meal_log import MealLog
from app.schemas.meal_log import MealLogCreate, MealLogRead, MealLogUpdate
from app.services.ws_manager import manager

router = APIRouter(prefix="/meals", tags=["meals"])

MEAL_NOT_FOUND = "Meal not found."
DISH_NOT_FOUND = "Dish not found."

_MEAL_NOT_FOUND = not_found_response("No such meal for this user", MEAL_NOT_FOUND)
_DISH_NOT_FOUND = not_found_response("No such dish for this user", DISH_NOT_FOUND)

# Chronological-within-a-day ordering for the slots.
_SLOT_ORDER = case(
    {"breakfast": 0, "lunch": 1, "dinner": 2, "snack": 3},
    value=MealLog.slot,
    else_=9,
)


async def _get_owned_meal(meal_id: int, user: CurrentUser, db: DbSession) -> MealLog:
    """Fetch a meal owned by the current user, or raise 404."""
    meal = await db.get(MealLog, meal_id)
    if meal is None or meal.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=MEAL_NOT_FOUND)
    return meal


@router.get(
    "",
    response_model=list[MealLogRead],
    summary="List meals logged in a date range",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def list_meals(
    start: date, end: date, current_user: CurrentUser, db: DbSession
) -> list[MealLog]:
    """Return the user's meals with ``start <= log_date <= end`` (both inclusive).

    Covers the calendar month grid and a single day (``start == end``), ordered
    by day, then slot (breakfast→snack), then when it was logged.
    """
    result = await db.scalars(
        select(MealLog)
        .where(
            MealLog.user_id == current_user.id,
            MealLog.log_date >= start,
            MealLog.log_date <= end,
        )
        .order_by(MealLog.log_date, _SLOT_ORDER, MealLog.created_at)
    )
    return list(result)


@router.post(
    "",
    response_model=MealLogRead,
    status_code=status.HTTP_201_CREATED,
    summary="Log a meal (a dish eaten in a slot on a day)",
    responses={**UNAUTHORIZED_RESPONSE, **_DISH_NOT_FOUND},
)
async def create_meal(
    payload: MealLogCreate, current_user: CurrentUser, db: DbSession
) -> MealLog:
    """Log a dish from the user's library into a day/slot.

    The dish must belong to the caller; its name is snapshotted onto the meal so
    the log survives the dish later being deleted.
    """
    dish = await db.get(Dish, payload.dish_id)
    if dish is None or dish.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=DISH_NOT_FOUND)

    meal = MealLog(
        user_id=current_user.id,
        log_date=payload.log_date,
        slot=payload.slot,
        dish_id=dish.id,
        dish_name=dish.name,
        note=payload.note,
    )
    db.add(meal)
    await db.commit()
    await db.refresh(meal)
    # Live-sync: tell the user's other open tabs/devices a meal changed.
    await manager.broadcast(
        current_user.id,
        {"type": "meal.created", "id": meal.id, "logDate": meal.log_date.isoformat()},
    )
    return meal


@router.patch(
    "/{meal_id}",
    response_model=MealLogRead,
    summary="Update a logged meal (slot / note)",
    responses={**UNAUTHORIZED_RESPONSE, **_MEAL_NOT_FOUND},
)
async def update_meal(
    meal_id: int, payload: MealLogUpdate, current_user: CurrentUser, db: DbSession
) -> MealLog:
    """Move a meal to another slot or edit its note. The dish isn't reassigned."""
    meal = await _get_owned_meal(meal_id, current_user, db)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(meal, field, value)

    await db.commit()
    await db.refresh(meal)
    await manager.broadcast(
        current_user.id,
        {"type": "meal.updated", "id": meal.id, "logDate": meal.log_date.isoformat()},
    )
    return meal


@router.delete(
    "/{meal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a logged meal",
    responses={**UNAUTHORIZED_RESPONSE, **_MEAL_NOT_FOUND},
)
async def delete_meal(meal_id: int, current_user: CurrentUser, db: DbSession) -> None:
    """Remove a meal from a day."""
    meal = await _get_owned_meal(meal_id, current_user, db)
    log_date = meal.log_date  # capture before the row is gone
    await db.delete(meal)
    await db.commit()
    await manager.broadcast(
        current_user.id,
        {"type": "meal.deleted", "id": meal_id, "logDate": log_date.isoformat()},
    )
