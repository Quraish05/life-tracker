"""Estimate a food's per-serving nutrition from its name and ingredients.

A sibling of :mod:`tag_suggestion`: it reads a food's draft text and *proposes*
per-serving calories and macros. The model proposes, the user disposes — the
client drops the numbers into the editor where they can be corrected before the
food is saved.

It reuses the shared provider plumbing in :mod:`app.services.ai_client` and the
same structured-output + validation-retry discipline (CCAF Domain 4.3 / 4.4).
"""

from app.schemas.food import Ingredient
from app.schemas.food_ai import NutritionEstimate
from app.services.ai_client import generate_structured

# Strict output contract: exactly the four integer macro fields, all required and
# no extras, so the result is guaranteed-shaped with no free-form parsing.
_SCHEMA: dict = {
    "type": "object",
    "additionalProperties": False,
    "required": ["calories", "protein_g", "carbs_g", "fat_g"],
    "properties": {
        "calories": {
            "type": "integer",
            "minimum": 0,
            "description": "Total energy in kcal for one typical serving.",
        },
        "protein_g": {
            "type": "integer",
            "minimum": 0,
            "description": "Grams of protein per serving.",
        },
        "carbs_g": {
            "type": "integer",
            "minimum": 0,
            "description": "Grams of carbohydrate per serving.",
        },
        "fat_g": {
            "type": "integer",
            "minimum": 0,
            "description": "Grams of fat per serving.",
        },
    },
}

_SYSTEM_PROMPT = """\
You are a nutrition estimator. Given a food's name and its ingredient list (each \
with a free-text amount), estimate the nutrition of ONE typical serving.

Return whole numbers only: calories in kcal, and protein, carbs, and fat in \
grams. Base your estimate on standard nutrition data for the named food and the \
amounts given. When an amount is missing or vague, assume a sensible single \
serving. For a composite dish, estimate the finished dish per serving, not the \
raw ingredients in bulk.

Be realistic, not precise-to-the-gram — a good ballpark is the goal. The macros \
should roughly account for the calories (protein and carbs ~4 kcal/g, fat \
~9 kcal/g), but don't force an exact match. Respond only via the provided JSON \
schema.

Examples:
- "Apple" (no ingredients) -> {"calories": 95, "protein_g": 0, "carbs_g": 25, "fat_g": 0}
- "Glass of whole milk", ingredients ["milk 250 ml"] -> \
{"calories": 150, "protein_g": 8, "carbs_g": 12, "fat_g": 8}
"""


def _build_user_message(*, name: str, ingredients: list[Ingredient]) -> str:
    """Assemble the request body from the draft the editor sent."""
    lines = [f"Food: {name}"]
    if ingredients:
        lines.append("Ingredients:")
        for ing in ingredients:
            amount = f" — {ing.amount}" if ing.amount else ""
            lines.append(f"- {ing.name}{amount}")
    else:
        lines.append("Ingredients: (none given — estimate a standard serving)")
    return "\n".join(lines)


async def estimate_nutrition(
    *, name: str, ingredients: list[Ingredient]
) -> tuple[NutritionEstimate, str]:
    """Estimate per-serving nutrition for a food, with the model that produced it.

    Raises :class:`~app.services.ai_client.AINotConfiguredError` when the
    provider's key is missing/rejected, or :class:`~app.services.ai_client.AIError`
    when the model never returns a valid result.
    """
    return await generate_structured(
        system=_SYSTEM_PROMPT,
        user_message=_build_user_message(name=name, ingredients=ingredients),
        anthropic_schema=_SCHEMA,
        response_model=NutritionEstimate,
    )
