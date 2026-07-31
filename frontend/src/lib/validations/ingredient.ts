import { z } from "zod";

/**
 * A pantry ingredient — mirrors the backend `IngredientBase` schema. Just a
 * name and a free-text "usual amount".
 */
export const ingredientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give it a name")
    .max(80, "Keep the name under 80 characters"),
  default_amount: z
    .string()
    .trim()
    .max(40, "Keep the amount under 40 characters"),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;
