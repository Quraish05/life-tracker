from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select

from app.api.deps import UNAUTHORIZED_RESPONSE, CurrentUser, DbSession
from app.api.responses import not_found_response
from app.models.dish import Dish
from app.schemas.dish import DishBase, DishCreate, DishRead, DishUpdate

# Fields that make up a dish's editable body (used to merge partial updates).
_DISH_FIELDS = ("name", "recipe_md", "ingredients")

router = APIRouter(prefix="/dishes", tags=["dishes"])

DISH_NOT_FOUND = "Dish not found."

_NOT_FOUND = not_found_response("No such dish for this user", DISH_NOT_FOUND)


async def _get_owned_dish(dish_id: int, user: CurrentUser, db: DbSession) -> Dish:
    """Fetch a dish owned by the current user, or raise 404."""
    dish = await db.get(Dish, dish_id)
    if dish is None or dish.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=DISH_NOT_FOUND)
    return dish


@router.get(
    "",
    response_model=list[DishRead],
    summary="List the current user's dishes",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def list_dishes(current_user: CurrentUser, db: DbSession) -> list[Dish]:
    """Return all of the user's dishes, most-recently updated first."""
    result = await db.scalars(
        select(Dish)
        .where(Dish.user_id == current_user.id)
        .order_by(Dish.updated_at.desc())
    )
    return list(result)


@router.post(
    "",
    response_model=DishRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a dish",
    responses={**UNAUTHORIZED_RESPONSE},
)
async def create_dish(payload: DishCreate, current_user: CurrentUser, db: DbSession) -> Dish:
    """Create a new dish for the current user."""
    dish = Dish(user_id=current_user.id, **payload.model_dump())
    db.add(dish)
    await db.commit()
    await db.refresh(dish)
    return dish


@router.get(
    "/{dish_id}",
    response_model=DishRead,
    summary="Get a single dish",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def get_dish(dish_id: int, current_user: CurrentUser, db: DbSession) -> Dish:
    """Return a single dish owned by the current user."""
    return await _get_owned_dish(dish_id, current_user, db)


@router.patch(
    "/{dish_id}",
    response_model=DishRead,
    summary="Update a dish (partial)",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def update_dish(
    dish_id: int, payload: DishUpdate, current_user: CurrentUser, db: DbSession
) -> Dish:
    """Apply a partial update to a dish.

    Only the fields present in the request change. The patch is merged onto the
    current values and re-validated through ``DishBase`` so ingredient cleaning
    and the count cap always hold; the validated ingredients are written back as
    plain dicts (the JSONB column stores objects, not Pydantic models).
    """
    dish = await _get_owned_dish(dish_id, current_user, db)

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return dish

    merged = {field: getattr(dish, field) for field in _DISH_FIELDS} | updates
    try:
        validated = DishBase.model_validate(merged)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors()[0].get("msg", "Invalid dish update"),
        ) from exc

    data = validated.model_dump()
    for field in _DISH_FIELDS:
        setattr(dish, field, data[field])

    await db.commit()
    await db.refresh(dish)
    return dish


@router.delete(
    "/{dish_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a dish",
    responses={**UNAUTHORIZED_RESPONSE, **_NOT_FOUND},
)
async def delete_dish(dish_id: int, current_user: CurrentUser, db: DbSession) -> None:
    """Permanently delete a dish owned by the current user."""
    dish = await _get_owned_dish(dish_id, current_user, db)
    await db.delete(dish)
    await db.commit()
