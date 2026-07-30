import type { Ingredient } from "@/lib/validations/food";

export type { Ingredient };

/**
 * A food is a reusable food entity: a name, an optional markdown recipe, and a
 * list of `{name, amount}` ingredients.
 */
export type FoodItem = {
  id: number;
  name: string;
  /** Optional markdown recipe — null when none was written. */
  recipe_md: string | null;
  ingredients: Ingredient[];
  created_at: string;
  updated_at: string;
};
