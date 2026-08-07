"""Seed a realistic food corpus (pantry + library + meal logs) for demo/dev.

Populates the three food tables for one user so the Food, Ingredients and daily
Log pages all have believable content:

- ``ingredients`` — a ~16-item pantry (name + usual amount).
- ``food_items`` — ~10 reusable foods with a markdown recipe, an embedded
  ``{name, amount}`` ingredient list, and hardcoded per-serving macros.
- ``meal_logs`` — ~20 meals dated across 2026-06-06 → 2026-07-16 so they line up
  with the seeded journal's cooking threads (the dal-rice reset, the stir-fry,
  ordering in on dinner-with-M / friends-in-town nights, the post-gym shake).

Idempotent: ingredients keyed by (user, name), foods by (user, name), meals by
(user, date, slot, food_name) — all skipped if already present, so re-running is
safe. Meal logs link to the library food by id and snapshot ``food_name``.

Run from backend/:
    uv run python -m scripts.seed_food                       # demo account
    uv run python -m scripts.seed_food you@example.com       # target by email
(An argument containing "@" is matched against email, otherwise username.)
"""

import asyncio
import sys
from datetime import date

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.food import FoodItem
from app.models.ingredient import Ingredient
from app.models.meal_log import MealLog
from app.models.user import User

# Default target when no CLI argument is given (the RAG/demo account).
SEED_USERNAME = "shellpreview"

# --- Pantry: (name, usual amount) -------------------------------------------
INGREDIENTS: list[tuple[str, str]] = [
    ("Basmati Rice", "1 cup (dry)"),
    ("Red Lentils (Masoor Dal)", "1/2 cup (dry)"),
    ("Onion", "1 medium"),
    ("Garlic", "2 cloves"),
    ("Ginger", "1 inch"),
    ("Tomato", "1 medium"),
    ("Spinach", "2 cups"),
    ("Chicken Breast", "150 g"),
    ("Eggs", "2"),
    ("Olive Oil", "1 tbsp"),
    ("Rolled Oats", "1/2 cup"),
    ("Banana", "1"),
    ("Greek Yogurt", "150 g"),
    ("Paneer", "100 g"),
    ("Mixed Vegetables", "1.5 cups"),
    ("Peanut Butter", "1 tbsp"),
    ("Rice Noodles", "80 g"),
]

# --- Food library: name -> (recipe_md, ingredients[{name,amount}], macros) ---
# macros = (calories, protein_g, carbs_g, fat_g) per serving.
FOODS: list[tuple[str, str, list[tuple[str, str]], tuple[int, int, int, int]]] = [
    (
        "Dal-Rice Reset",
        "Rinse the dal and simmer with turmeric until soft. Temper onion, garlic, "
        "ginger and tomato in a little oil, fold in the dal, and serve over rice. "
        "The anchor meal — cheap, fast, and steadying.",
        [
            ("Red Lentils (Masoor Dal)", "1/2 cup"),
            ("Basmati Rice", "1 cup cooked"),
            ("Onion", "1/2 medium"),
            ("Garlic", "2 cloves"),
            ("Tomato", "1 small"),
            ("Olive Oil", "1 tsp"),
        ],
        (520, 22, 88, 8),
    ),
    (
        "Veg Stir-Fry with Rice Noodles",
        "Soak the noodles, then toss mixed veg over high heat with garlic and soy, "
        "add the noodles and a splash of the soaking water to bring it together.",
        [
            ("Rice Noodles", "80 g"),
            ("Mixed Vegetables", "1.5 cups"),
            ("Garlic", "2 cloves"),
            ("Olive Oil", "1 tbsp"),
        ],
        (430, 12, 70, 11),
    ),
    (
        "Overnight Oats with Banana",
        "Combine oats with milk or yogurt and leave overnight; top with sliced "
        "banana in the morning. Zero-effort breakfast on run days.",
        [
            ("Rolled Oats", "1/2 cup"),
            ("Banana", "1"),
            ("Greek Yogurt", "80 g"),
        ],
        (350, 12, 58, 9),
    ),
    (
        "Greek Yogurt & Berry Bowl",
        "Thick greek yogurt with whatever berries are around and a spoon of oats "
        "for crunch. Light, high-protein.",
        [
            ("Greek Yogurt", "150 g"),
            ("Rolled Oats", "2 tbsp"),
        ],
        (240, 20, 28, 6),
    ),
    (
        "Grilled Chicken & Veg",
        "Season the chicken breast and grill; roast or steam the mixed veg "
        "alongside. The reliable high-protein dinner.",
        [
            ("Chicken Breast", "150 g"),
            ("Mixed Vegetables", "1.5 cups"),
            ("Olive Oil", "1 tbsp"),
        ],
        (410, 45, 18, 16),
    ),
    (
        "Paneer Bhurji",
        "Crumble paneer into a tempered base of onion, tomato, ginger and spices; "
        "cook until dry. Vegetarian protein in ten minutes.",
        [
            ("Paneer", "100 g"),
            ("Onion", "1/2 medium"),
            ("Tomato", "1 small"),
            ("Ginger", "1 inch"),
            ("Olive Oil", "1 tsp"),
        ],
        (380, 22, 12, 28),
    ),
    (
        "Masala Omelette",
        "Two eggs beaten with chopped onion, tomato and chilli, cooked in a little "
        "oil. Fast breakfast that actually keeps me full.",
        [
            ("Eggs", "2"),
            ("Onion", "1/4 medium"),
            ("Tomato", "1/2 small"),
            ("Olive Oil", "1 tsp"),
        ],
        (240, 16, 4, 18),
    ),
    (
        "Banana Peanut Protein Shake",
        "Blend banana, peanut butter, greek yogurt and milk with a scoop of "
        "protein. The post-run / post-gym default.",
        [
            ("Banana", "1"),
            ("Peanut Butter", "1 tbsp"),
            ("Greek Yogurt", "100 g"),
        ],
        (420, 35, 45, 12),
    ),
    (
        "Margherita Pizza",
        "Order-in night. Two slices, no guilt.",
        [],
        (560, 22, 68, 22),
    ),
    (
        "Chicken Biryani",
        "Order-in. Special-occasion dinner.",
        [],
        (680, 34, 82, 24),
    ),
]

# --- Meal logs: (date, slot, food_name, note) -------------------------------
# slot is one of breakfast | lunch | dinner | snack.
MEALS: list[tuple[str, str, str, str | None]] = [
    ("2026-06-06", "dinner", "Chicken Biryani", "Dinner with M — order-in"),
    ("2026-06-11", "breakfast", "Overnight Oats with Banana", "Pre-run"),
    ("2026-06-15", "breakfast", "Masala Omelette", None),
    ("2026-06-15", "dinner", "Dal-Rice Reset", "Fourth night cooking in a row"),
    ("2026-06-19", "lunch", "Margherita Pizza", "Friends in town"),
    ("2026-06-29", "dinner", "Dal-Rice Reset", None),
    ("2026-07-01", "breakfast", "Greek Yogurt & Berry Bowl", None),
    ("2026-07-01", "lunch", "Grilled Chicken & Veg", "Quiet weekend cook"),
    ("2026-07-02", "breakfast", "Masala Omelette", None),
    ("2026-07-04", "breakfast", "Banana Peanut Protein Shake", "After the 7k"),
    ("2026-07-05", "dinner", "Margherita Pizza", "Order-in, shipped v0"),
    ("2026-07-09", "breakfast", "Greek Yogurt & Berry Bowl", None),
    ("2026-07-09", "dinner", "Veg Stir-Fry with Rice Noodles", "Branching out from dal-rice"),
    ("2026-07-11", "dinner", "Paneer Bhurji", "Reclaimed side-project evening"),
    ("2026-07-12", "dinner", "Grilled Chicken & Veg", "Gym day"),
    ("2026-07-12", "snack", "Banana Peanut Protein Shake", "Post-gym"),
    ("2026-07-14", "breakfast", "Overnight Oats with Banana", None),
    ("2026-07-14", "dinner", "Dal-Rice Reset", "Routine, sticking"),
    ("2026-07-16", "breakfast", "Masala Omelette", None),
    ("2026-07-16", "lunch", "Grilled Chicken & Veg", None),
]


async def main() -> None:
    # Target selector: a CLI arg picks the account (email if it contains "@",
    # otherwise username); with no arg we fall back to the demo account.
    target = sys.argv[1] if len(sys.argv) > 1 else SEED_USERNAME
    field = User.email if "@" in target else User.username

    async with async_session_factory() as db:
        user = await db.scalar(select(User).where(field == target))
        if user is None:
            raise SystemExit(f"User {target!r} not found — nothing to seed.")

        # 1) Pantry ingredients — skip any (user, name) already present.
        have_ing = set(
            (
                await db.execute(
                    select(Ingredient.name).where(Ingredient.user_id == user.id)
                )
            ).scalars()
        )
        added_ing = 0
        for name, amount in INGREDIENTS:
            if name in have_ing:
                continue
            db.add(Ingredient(user_id=user.id, name=name, default_amount=amount))
            added_ing += 1

        # 2) Food library — skip existing names; build name -> id for meal links.
        existing_foods = {
            f.name: f.id
            for f in (
                await db.execute(select(FoodItem).where(FoodItem.user_id == user.id))
            ).scalars()
        }
        added_food = 0
        new_foods: list[FoodItem] = []
        for name, recipe, ings, (cal, p, c, fat) in FOODS:
            if name in existing_foods:
                continue
            item = FoodItem(
                user_id=user.id,
                name=name,
                recipe_md=recipe,
                ingredients=[{"name": n, "amount": a} for n, a in ings],
                calories=cal,
                protein_g=p,
                carbs_g=c,
                fat_g=fat,
            )
            db.add(item)
            new_foods.append(item)
            added_food += 1

        # Flush so the new food items get ids before we reference them in logs.
        await db.flush()
        food_id_by_name = {**existing_foods, **{f.name: f.id for f in new_foods}}

        # 3) Meal logs — skip any (user, date, slot, food_name) already present.
        have_meals = set(
            (
                await db.execute(
                    select(
                        MealLog.log_date, MealLog.slot, MealLog.food_name
                    ).where(MealLog.user_id == user.id)
                )
            ).all()
        )
        added_meal = 0
        for iso, slot, food_name, note in MEALS:
            log_date = date.fromisoformat(iso)
            if (log_date, slot, food_name) in have_meals:
                continue
            db.add(
                MealLog(
                    user_id=user.id,
                    log_date=log_date,
                    slot=slot,
                    food_id=food_id_by_name.get(food_name),
                    food_name=food_name,
                    note=note,
                )
            )
            added_meal += 1

        await db.commit()
        print(
            f"Seeded for {user.username}: "
            f"+{added_ing} ingredients, +{added_food} foods, +{added_meal} meals."
        )


if __name__ == "__main__":
    asyncio.run(main())
