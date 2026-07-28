import type { MealSlot } from "@/lib/validations/meal";

/**
 * A meal log: one dish eaten in a slot on a day. `dish_name` is snapshotted
 * server-side, so a log stays readable even after its dish is deleted (then
 * `dish_id` is null).
 */
export type MealLog = {
  id: number;
  log_date: string;
  slot: MealSlot;
  /** Null once the source dish is deleted. */
  dish_id: number | null;
  dish_name: string;
  note: string | null;
  created_at: string;
};
