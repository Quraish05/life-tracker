import { z } from "zod";

// Slots a meal can go in. Breakfast/lunch/dinner always show; snacks (capped in
// the UI) are optional. Mirrors the backend `MealSlot` Literal.
export const mealSlots = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealSlot = (typeof mealSlots)[number];

/** Max length of a meal's free-text portion/note — mirrors the API. */
export const MEAL_NOTE_MAX = 200;

/** What the client sends to log a meal. */
export const mealSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  slot: z.enum(mealSlots),
  dish_id: z.number().int().positive(),
  note: z.string().trim().max(MEAL_NOTE_MAX).optional(),
});

export type MealInput = z.infer<typeof mealSchema>;
