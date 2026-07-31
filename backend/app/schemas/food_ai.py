"""Request/response schemas for the AI nutrition estimator.

The estimator takes a food's *draft* text (name + ingredient lines) rather than a
saved id, so it works while a food is still being created — mirroring the note
tag-suggestion endpoint. It *proposes* per-serving macros; the client fills them
into the editor and the user saves (or corrects) them, so nothing is written by
the model directly.
"""

from pydantic import BaseModel, Field

from app.schemas.food import MAX_CALORIES, MAX_MACRO_G, Ingredient


class NutritionEstimateRequest(BaseModel):
    """The draft food to estimate — name plus its ingredient lines."""

    name: str = Field(min_length=1, max_length=120)
    ingredients: list[Ingredient] = Field(default_factory=list)


class NutritionEstimate(BaseModel):
    """The per-serving macros the model returns (and the validation target).

    Every field is required here — the AI must commit to a number for each,
    even a rough one — but they map onto the food's nullable columns on save.
    """

    calories: int = Field(ge=0, le=MAX_CALORIES)
    protein_g: int = Field(ge=0, le=MAX_MACRO_G)
    carbs_g: int = Field(ge=0, le=MAX_MACRO_G)
    fat_g: int = Field(ge=0, le=MAX_MACRO_G)


class NutritionEstimateResponse(NutritionEstimate):
    """The estimate plus the model that produced it (for transparency)."""

    model: str
