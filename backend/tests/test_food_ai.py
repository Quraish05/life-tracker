"""Unit tests for the AI nutrition estimator's pure parts (no network).

The live API call goes through the shared, already-tested ``generate_structured``
plumbing; here we pin the bits this feature owns: the strict output schema's
bounds and the prompt-building that feeds the model.
"""

import pytest
from pydantic import ValidationError

from app.schemas.food import Ingredient
from app.schemas.food_ai import NutritionEstimate, NutritionEstimateRequest
from app.services.nutrition_estimation import _build_user_message

# ---- NutritionEstimate bounds ----------------------------------------------


def test_estimate_accepts_realistic_values():
    est = NutritionEstimate(calories=620, protein_g=44, carbs_g=62, fat_g=21)
    assert est.calories == 620


def test_estimate_rejects_negative():
    with pytest.raises(ValidationError):
        NutritionEstimate(calories=-1, protein_g=0, carbs_g=0, fat_g=0)


def test_estimate_rejects_runaway_values():
    # Guards against a model that returns per-100g-of-bulk nonsense.
    with pytest.raises(ValidationError):
        NutritionEstimate(calories=999_999, protein_g=0, carbs_g=0, fat_g=0)


def test_estimate_requires_all_macros():
    with pytest.raises(ValidationError):
        NutritionEstimate(calories=100)  # type: ignore[call-arg]


# ---- request schema ---------------------------------------------------------


def test_request_defaults_to_no_ingredients():
    req = NutritionEstimateRequest(name="Apple")
    assert req.ingredients == []


def test_request_requires_a_name():
    with pytest.raises(ValidationError):
        NutritionEstimateRequest(name="")


# ---- prompt building --------------------------------------------------------


def test_build_message_lists_ingredients_with_amounts():
    msg = _build_user_message(
        name="Chicken shawarma bowl",
        ingredients=[
            Ingredient(name="Chicken thigh", amount="180g"),
            Ingredient(name="Tomato", amount=""),
        ],
    )
    assert "Food: Chicken shawarma bowl" in msg
    assert "- Chicken thigh — 180g" in msg
    # An amount-less ingredient appears without the dash separator.
    assert "- Tomato" in msg
    assert "Tomato —" not in msg


def test_build_message_notes_when_no_ingredients():
    msg = _build_user_message(name="Apple", ingredients=[])
    assert "Food: Apple" in msg
    assert "none given" in msg
