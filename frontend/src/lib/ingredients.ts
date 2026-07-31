import { ApiError, request, tokenStore } from "@/lib/api";
import type { IngredientInput } from "@/lib/validations/ingredient";
import type { Ingredient } from "@/types/ingredient";

/**
 * Pantry ingredients data layer — a thin client over the backend `ingredients`
 * API. Consumed through the React Query hooks in `lib/use-ingredients.ts`.
 */

/** Grab the current token, or fail loudly rather than hit the API unauthenticated. */
function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const ingredientsApi = {
  list: (): Promise<Ingredient[]> =>
    request<Ingredient[]>("/ingredients", { token: authToken() }),

  create: (input: IngredientInput): Promise<Ingredient> =>
    request<Ingredient>("/ingredients", { method: "POST", body: input, token: authToken() }),

  update: (id: number, patch: Partial<IngredientInput>): Promise<Ingredient> =>
    request<Ingredient>(`/ingredients/${id}`, {
      method: "PATCH",
      body: patch,
      token: authToken(),
    }),

  remove: (id: number): Promise<void> =>
    request<void>(`/ingredients/${id}`, { method: "DELETE", token: authToken() }),
};
