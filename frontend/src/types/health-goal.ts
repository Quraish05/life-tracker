import type { HealthGoalInput } from "@/lib/validations/health-goal";

/** The user's persisted health goal (one per user). */
export type HealthGoal = HealthGoalInput & {
  id: number;
  created_at: string;
  updated_at: string;
};
