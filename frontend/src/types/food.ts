import type { Ingredient } from "@/lib/validations/food";
import type { MealLog } from "@/types/meal";
import type { MealSlot } from "@/lib/validations/meal";

export type { Ingredient };

/** The four per-serving macros a food carries; `null` when not yet known. */
export type Nutrition = {
  /** Energy in kcal. */
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

/**
 * A food is a reusable food entity: a name, an optional markdown recipe, a
 * list of `{name, amount}` ingredients, and optional per-serving nutrition
 * (`null` until estimated by AI or filled in by hand).
 */
export type FoodItem = Nutrition & {
  id: number;
  name: string;
  /** Optional markdown recipe — null when none was written. */
  recipe_md: string | null;
  ingredients: Ingredient[];
  created_at: string;
  updated_at: string;
};

/** AI's per-serving estimate (every macro present) plus the model that made it. */
export type NutritionEstimate = { [K in keyof Nutrition]: number } & {
  model: string;
};

/** How a food has been logged — powers the reader's activity panel. */
export type FoodActivity = {
  count: number;
  /** Most-used slot, or null if never logged. */
  top_slot: MealSlot | null;
  /** Newest logs first. */
  recent: MealLog[];
};

/**
 * A "log again" shortcut: a frequently-logged food plus the slot it's usually
 * eaten in and its total log count. Powers the log page's one-tap-again rail —
 * tapping it re-logs the food straight into `top_slot`.
 */
export type FrequentFood = {
  food_id: number;
  name: string;
  count: number;
  top_slot: MealSlot;
};
