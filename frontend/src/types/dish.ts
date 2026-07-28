import type { Ingredient } from "@/lib/validations/dish";

export type { Ingredient };

/**
 * A dish is a reusable food entity: a name, an optional markdown recipe, and a
 * list of `{name, amount}` ingredients.
 */
export type Dish = {
  id: number;
  name: string;
  /** Optional markdown recipe — null when none was written. */
  recipe_md: string | null;
  ingredients: Ingredient[];
  created_at: string;
  updated_at: string;
};
