import { ApiError, request, tokenStore } from "@/lib/api";
import type { MealInput, MealSlot } from "@/lib/validations/meal";

/**
 * Meals data layer — a thin client over the backend `meals` API.
 * Consumed through the React Query hooks in `lib/use-meals.ts`.
 *
 * A meal log is one dish eaten in a slot on a day. `dish_name` is snapshotted
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

function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const mealsApi = {
  /** Meals with start <= log_date <= end (both inclusive). */
  list: (start: string, end: string): Promise<MealLog[]> =>
    request<MealLog[]>(`/meals?start=${start}&end=${end}`, { token: authToken() }),

  create: (input: MealInput): Promise<MealLog> =>
    request<MealLog>("/meals", { method: "POST", body: input, token: authToken() }),

  /** Move a meal to another slot or edit its note (dish isn't reassigned). */
  update: (
    id: number,
    patch: { slot?: MealSlot; note?: string | null },
  ): Promise<MealLog> =>
    request<MealLog>(`/meals/${id}`, { method: "PATCH", body: patch, token: authToken() }),

  remove: (id: number): Promise<void> =>
    request<void>(`/meals/${id}`, { method: "DELETE", token: authToken() }),
};
