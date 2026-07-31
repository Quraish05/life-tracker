/**
 * A pantry ingredient: a reusable `{ name, default_amount }` entry the user can
 * sprinkle onto food items. No nutrition — macros are estimated at the food
 * level. (Distinct from the embedded `{name, amount}` lines on a FoodItem.)
 */
export type Ingredient = {
  id: number;
  name: string;
  /** Free-text default portion, e.g. "40 g". Empty string when unset. */
  default_amount: string;
  created_at: string;
  updated_at: string;
};
