import { z } from "zod";

/** Max ingredients per food — one place for the schema and the editor. */
export const MAX_INGREDIENTS = 40;

/**
 * One ingredient line: a name and a free-text amount ("200g", "2 cups").
 * `name` carries no min here — the editor keeps blank rows while you type, and
 * both the submit handler and the backend drop them before saving.
 */
export const ingredientSchema = z.object({
  name: z.string().trim().max(80, "Keep the name under 80 characters"),
  amount: z.string().trim().max(40, "Keep the amount under 40 characters"),
});

export type Ingredient = z.infer<typeof ingredientSchema>;

/** Sanity bounds for per-serving nutrition — mirror the backend. */
export const MAX_CALORIES = 20_000;
export const MAX_MACRO_G = 5_000;

/**
 * An optional whole-number macro field: a non-negative integer, or `null` when
 * unset. The editor's number inputs convert an empty field to `null` via
 * `setValueAs`, so the schema stays a clean `number | null` (no `unknown` input
 * type to fight react-hook-form's resolver typing).
 */
const macro = (max: number) =>
  z
    .number()
    .int("Whole numbers only")
    .min(0, "Can't be negative")
    .max(max, `That seems too high`)
    .nullable();

export const foodItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give it a name")
    .max(120, "Keep the name under 120 characters"),
  // Optional markdown recipe. Empty string is fine — the API stores it as null.
  recipe_md: z
    .string()
    .trim()
    .max(20_000, "That's a lot — keep it under 20,000 characters"),
  ingredients: z
    .array(ingredientSchema)
    .max(MAX_INGREDIENTS, `Up to ${MAX_INGREDIENTS} ingredients`),
  // Per-serving nutrition — optional, filled by the AI estimator or by hand.
  calories: macro(MAX_CALORIES),
  protein_g: macro(MAX_MACRO_G),
  carbs_g: macro(MAX_MACRO_G),
  fat_g: macro(MAX_MACRO_G),
});

export type FoodItemInput = z.infer<typeof foodItemSchema>;
