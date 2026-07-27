"""Request/response schemas for dishes.

These mirror the frontend Zod schema in
`frontend/src/lib/validations/dish.ts` so client and server agree on shape and
limits. A dish is a reusable food entity: a name, an optional markdown recipe,
and a list of ``{name, amount}`` ingredients where ``amount`` is free text.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_INGREDIENTS = 40


class Ingredient(BaseModel):
    """One ingredient line: a name plus a free-text amount ("200g", "2 cups")."""

    name: str = Field(min_length=1, max_length=80)
    amount: str = Field(default="", max_length=40)

    @field_validator("name", "amount")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class DishBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    recipe_md: str | None = Field(default=None, max_length=20_000)
    ingredients: list[Ingredient] = Field(default_factory=list)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        # Strip before length checks so a whitespace-only name fails min_length.
        return value.strip() if isinstance(value, str) else value

    @field_validator("recipe_md")
    @classmethod
    def _strip_recipe(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("ingredients", mode="before")
    @classmethod
    def _drop_blank_ingredients(cls, value: object) -> object:
        """Drop rows with a blank/missing name *before* per-item validation.

        The editor keeps half-typed rows while you work; this makes the API
        forgiving of them (rather than 422-ing on ``Ingredient.name``'s
        min-length), matching what the client filters out on submit.
        """
        if not isinstance(value, list):
            return value
        kept = []
        for item in value:
            name = item.get("name") if isinstance(item, dict) else getattr(item, "name", None)
            if isinstance(name, str) and name.strip():
                kept.append(item)
        return kept

    @field_validator("ingredients")
    @classmethod
    def _cap_ingredients(cls, ingredients: list[Ingredient]) -> list[Ingredient]:
        """Enforce the count cap after rows are cleaned and validated."""
        if len(ingredients) > MAX_INGREDIENTS:
            raise ValueError(f"Up to {MAX_INGREDIENTS} ingredients")
        return ingredients


class DishCreate(DishBase):
    pass


class DishUpdate(BaseModel):
    """Partial update (PATCH semantics).

    Every field is optional: omitted fields keep their current value. Validation
    (name limits, ingredient cleaning/cap) is applied against the merged result
    in the route by re-validating through ``DishBase``.
    """

    name: str | None = Field(default=None, min_length=1, max_length=120)
    recipe_md: str | None = Field(default=None, max_length=20_000)
    ingredients: list[Ingredient] | None = None


class DishRead(DishBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
