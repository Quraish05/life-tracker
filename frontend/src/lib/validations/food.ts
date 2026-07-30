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
});

export type FoodItemInput = z.infer<typeof foodItemSchema>;
