import { ApiError, request, tokenStore } from "@/lib/api";
import type { FoodItemInput, Ingredient } from "@/lib/validations/food";
import type {
  FoodActivity,
  FoodItem,
  FrequentFood,
  NutritionEstimate,
} from "@/types/food";

/** The draft a food's nutrition is estimated from (works before it's saved). */
export type NutritionEstimateInput = {
  name: string;
  ingredients: Ingredient[];
};

/**
 * Food data layer — a thin client over the backend `food` API.
 * Consumed through the React Query hooks in `lib/use-food.ts`.
 */

/** Grab the current token, or fail loudly rather than hit the API unauthenticated. */
function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const foodApi = {
  list: (): Promise<FoodItem[]> => request<FoodItem[]>("/food", { token: authToken() }),

  create: (input: FoodItemInput): Promise<FoodItem> =>
    request<FoodItem>("/food", { method: "POST", body: input, token: authToken() }),

  /** Partially update a food — only the fields in `patch` change. */
  update: (id: number, patch: Partial<FoodItemInput>): Promise<FoodItem> =>
    request<FoodItem>(`/food/${id}`, { method: "PATCH", body: patch, token: authToken() }),

  remove: (id: number): Promise<void> =>
    request<void>(`/food/${id}`, { method: "DELETE", token: authToken() }),

  /** Ask the AI to estimate per-serving nutrition from a food's draft text. */
  estimateNutrition: (input: NutritionEstimateInput): Promise<NutritionEstimate> =>
    request<NutritionEstimate>("/food/estimate-nutrition", {
      method: "POST",
      body: input,
      token: authToken(),
    }),

  /** How a food has been logged: count, top slot, and recent logs. */
  activity: (id: number): Promise<FoodActivity> =>
    request<FoodActivity>(`/food/${id}/activity`, { token: authToken() }),

  /** The user's most-logged foods with their usual slot (log-again rail). */
  frequent: (): Promise<FrequentFood[]> =>
    request<FrequentFood[]>("/food/frequent", { token: authToken() }),
};
