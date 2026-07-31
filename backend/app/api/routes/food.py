from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import func, select

from app.api.ai_errors import ai_errors_as_http
from app.api.ai_quota import (
    QUOTA_EXCEEDED_RESPONSE,
    enforce_ai_quota,
    record_ai_usage,
)
from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.api.responses import not_found_response
from app.models.food import FoodItem
from app.models.meal_log import MealLog
from app.schemas.food import (
    FoodActivity,
    FoodItemBase,
    FoodItemCreate,
    FoodItemRead,
    FoodItemUpdate,
)
from app.schemas.food_ai import NutritionEstimateRequest, NutritionEstimateResponse
from app.services.nutrition_estimation import estimate_nutrition

# Fields that make up a food item's editable body (used to merge partial updates).
_FOOD_FIELDS = (
    "name",
    "recipe_md",
    "ingredients",
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
)

# How many recent logs the activity panel shows.
_RECENT_LOG_LIMIT = 5

router = APIRouter(prefix="/food", tags=["food"])

FOOD_NOT_FOUND = "Food not found."

_NOT_FOUND = not_found_response("No such food for this user", FOOD_NOT_FOUND)


async def _get_owned_food(food_id: int, user: CurrentUser, db: DbSession) -> FoodItem:
    """Fetch a food item owned by the current user, or raise 404."""
    food = await db.get(FoodItem, food_id)
    if food is None or food.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=FOOD_NOT_FOUND)
    return food


@router.get(
    "",
    response_model=list[FoodItemRead],
    summary="List the current user's food items",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def list_food(current_user: CurrentUser, db: DbSession) -> list[FoodItem]:
    """Return all of the user's food items, most-recently updated first."""
    result = await db.scalars(
        select(FoodItem)
        .where(FoodItem.user_id == current_user.id)
        .order_by(FoodItem.updated_at.desc())
    )
    return list(result)


@router.post(
    "",
    response_model=FoodItemRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a food item",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def create_food(
    payload: FoodItemCreate, current_user: CurrentUser, db: DbSession
) -> FoodItem:
    """Create a new food item for the current user."""
    food = FoodItem(user_id=current_user.id, **payload.model_dump())
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return food


@router.post(
    "/estimate-nutrition",
    response_model=NutritionEstimateResponse,
    summary="Estimate per-serving nutrition for a draft food (AI)",
    responses={**UNAUTHORIZED_RESPONSE, **QUOTA_EXCEEDED_RESPONSE},
)
async def estimate_food_nutrition(
    payload: NutritionEstimateRequest, current_user: CurrentUser, db: DbSession
) -> NutritionEstimateResponse:
    """Estimate per-serving calories and macros for a food's draft text.

    Content-in-body (not a saved food id) so it works while a food is still being
    created and reflects the ingredients being typed right now. Nothing is
    written — the client fills the numbers into the editor and the user saves (or
    corrects) them. ``current_user`` gates the AI cost behind auth and the quota.
    """
    enforce_ai_quota(current_user)
    with ai_errors_as_http("Could not estimate nutrition right now. Please try again."):
        estimate, model = await estimate_nutrition(
            name=payload.name, ingredients=payload.ingredients
        )
    await record_ai_usage(current_user, db)

    return NutritionEstimateResponse(model=model, **estimate.model_dump())


@router.get(
    "/{food_id}",
    response_model=FoodItemRead,
    summary="Get a single food item",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def get_food(food_id: int, current_user: CurrentUser, db: DbSession) -> FoodItem:
    """Return a single food item owned by the current user."""
    return await _get_owned_food(food_id, current_user, db)


@router.get(
    "/{food_id}/activity",
    response_model=FoodActivity,
    summary="How a food item has been logged (count, top slot, recent logs)",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def get_food_activity(
    food_id: int, current_user: CurrentUser, db: DbSession
) -> FoodActivity:
    """Summarize a food's meal-log history for the reader's activity panel.

    Returns the total number of times it's been logged, its most-used slot, and
    the most recent handful of logs (newest first).
    """
    await _get_owned_food(food_id, current_user, db)

    # Count per slot in one pass: total is the sum, top slot is the busiest.
    per_slot = (
        await db.execute(
            select(MealLog.slot, func.count().label("n"))
            .where(MealLog.user_id == current_user.id, MealLog.food_id == food_id)
            .group_by(MealLog.slot)
            .order_by(func.count().desc())
        )
    ).all()
    count = sum(row.n for row in per_slot)
    top_slot = per_slot[0].slot if per_slot else None

    recent = list(
        await db.scalars(
            select(MealLog)
            .where(MealLog.user_id == current_user.id, MealLog.food_id == food_id)
            .order_by(MealLog.log_date.desc(), MealLog.created_at.desc())
            .limit(_RECENT_LOG_LIMIT)
        )
    )

    return FoodActivity(count=count, top_slot=top_slot, recent=recent)


@router.patch(
    "/{food_id}",
    response_model=FoodItemRead,
    summary="Update a food item (partial)",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def update_food(
    food_id: int, payload: FoodItemUpdate, current_user: CurrentUser, db: DbSession
) -> FoodItem:
    """Apply a partial update to a food item.

    Only the fields present in the request change. The patch is merged onto the
    current values and re-validated through ``FoodItemBase`` so ingredient
    cleaning and the count cap always hold; the validated ingredients are written
    back as plain dicts (the JSONB column stores objects, not Pydantic models).
    """
    food = await _get_owned_food(food_id, current_user, db)

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return food

    merged = {field: getattr(food, field) for field in _FOOD_FIELDS} | updates
    try:
        validated = FoodItemBase.model_validate(merged)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors()[0].get("msg", "Invalid food update"),
        ) from exc

    data = validated.model_dump()
    for field in _FOOD_FIELDS:
        setattr(food, field, data[field])

    await db.commit()
    await db.refresh(food)
    return food


@router.delete(
    "/{food_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a food item",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def delete_food(food_id: int, current_user: CurrentUser, db: DbSession) -> None:
    """Permanently delete a food item owned by the current user."""
    food = await _get_owned_food(food_id, current_user, db)
    await db.delete(food)
    await db.commit()
