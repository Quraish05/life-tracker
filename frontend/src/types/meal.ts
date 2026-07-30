import type { MealSlot } from "@/lib/validations/meal";

/**
 * A meal log: one food eaten in a slot on a day. `food_name` is snapshotted
 * server-side, so a log stays readable even after its food is deleted (then
 * `food_id` is null).
 */
export type MealLog = {
  id: number;
  log_date: string;
  slot: MealSlot;
  /** Null once the source food is deleted. */
  food_id: number | null;
  food_name: string;
  note: string | null;
  created_at: string;
};
