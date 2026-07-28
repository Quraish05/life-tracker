import { ApiError, request, tokenStore } from "@/lib/api";
import type { MealInput, MealSlot } from "@/lib/validations/meal";
import type { MealLog } from "@/types/meal";

/**
 * Meals data layer — a thin client over the backend `meals` API.
 * Consumed through the React Query hooks in `lib/use-meals.ts`.
 */

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
