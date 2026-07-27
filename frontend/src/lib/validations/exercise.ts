import { z } from "zod";

/** Field limits — mirror the API (`app/schemas/exercise_log.py`). */
export const EXERCISE_NAME_MAX = 80;
export const EXERCISE_NOTE_MAX = 120;

export const exerciseSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  name: z
    .string()
    .trim()
    .min(1, "Name the exercise")
    .max(EXERCISE_NAME_MAX, `Keep it under ${EXERCISE_NAME_MAX} characters`),
  note: z.string().trim().max(EXERCISE_NOTE_MAX).optional(),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;
