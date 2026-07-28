import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { healthGoalApi, type HealthGoal } from "@/lib/health-goal";
import type { HealthGoalInput } from "@/lib/validations/health-goal";

export const healthGoalKey = ["health-goal"] as const;

/** The user's health goal (null when unset). */
export function useHealthGoal() {
  return useQuery({ queryKey: healthGoalKey, queryFn: healthGoalApi.get });
}

export function useUpsertHealthGoal(): UseMutationResult<
  HealthGoal,
  Error,
  HealthGoalInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: HealthGoalInput) => healthGoalApi.upsert(input),
    onSuccess: (goal) => queryClient.setQueryData(healthGoalKey, goal),
  });
}
