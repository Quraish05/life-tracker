import { ApiError, request, tokenStore } from "@/lib/api";
import type { DishInput } from "@/lib/validations/dish";
import type { Dish } from "@/types/dish";

/**
 * Dishes data layer — a thin client over the backend `dishes` API.
 * Consumed through the React Query hooks in `lib/use-dishes.ts`.
 */

/** Grab the current token, or fail loudly rather than hit the API unauthenticated. */
function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const dishesApi = {
  list: (): Promise<Dish[]> => request<Dish[]>("/dishes", { token: authToken() }),

  create: (input: DishInput): Promise<Dish> =>
    request<Dish>("/dishes", { method: "POST", body: input, token: authToken() }),

  /** Partially update a dish — only the fields in `patch` change. */
  update: (id: number, patch: Partial<DishInput>): Promise<Dish> =>
    request<Dish>(`/dishes/${id}`, { method: "PATCH", body: patch, token: authToken() }),

  remove: (id: number): Promise<void> =>
    request<void>(`/dishes/${id}`, { method: "DELETE", token: authToken() }),
};
