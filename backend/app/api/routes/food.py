from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.api.responses import not_found_response
from app.models.food import FoodItem
from app.schemas.food import FoodItemBase, FoodItemCreate, FoodItemRead, FoodItemUpdate

# Fields that make up a food item's editable body (used to merge partial updates).
_FOOD_FIELDS = ("name", "recipe_md", "ingredients")

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


@router.get(
    "/{food_id}",
    response_model=FoodItemRead,
    summary="Get a single food item",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def get_food(food_id: int, current_user: CurrentUser, db: DbSession) -> FoodItem:
    """Return a single food item owned by the current user."""
    return await _get_owned_food(food_id, current_user, db)


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
