import { ApiError, request, tokenStore } from "@/lib/api";
import type { HealthGoalInput } from "@/lib/validations/health-goal";

/**
 * Health goal data layer — a thin client over the backend `health-goal` API.
 * One goal per user; `get` resolves to null when none is set yet.
 */

export type HealthGoal = HealthGoalInput & {
  id: number;
  created_at: string;
  updated_at: string;
};

function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const healthGoalApi = {
  /** The user's goal, or null if unset. */
  get: (): Promise<HealthGoal | null> =>
    request<HealthGoal | null>("/health-goal", { token: authToken() }),

  /** Create or replace the goal. */
  upsert: (input: HealthGoalInput): Promise<HealthGoal> =>
    request<HealthGoal>("/health-goal", {
      method: "PUT",
      body: input,
      token: authToken(),
    }),
};
