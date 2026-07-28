import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { exercisesApi } from "@/lib/exercises";
import type { ExerciseLog } from "@/types/exercise";
import type { ExerciseInput } from "@/lib/validations/exercise";

/** Prefix key for every exercises query — mutations invalidate the whole prefix
 * so the month grid and a single day refresh together. */
export const exercisesKey = ["exercises"] as const;

/** Exercises in [start, end]. Disabled until both bounds are known. */
export function useExercises(start: string, end: string) {
  return useQuery({
    queryKey: [...exercisesKey, start, end],
    queryFn: () => exercisesApi.list(start, end),
    enabled: Boolean(start && end),
  });
}

function useInvalidateExercises() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: exercisesKey });
}

export function useCreateExercise(): UseMutationResult<
  ExerciseLog,
  Error,
  ExerciseInput
> {
  const invalidate = useInvalidateExercises();
  return useMutation({
    mutationFn: (input: ExerciseInput) => exercisesApi.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteExercise(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateExercises();
  return useMutation({
    mutationFn: (id: number) => exercisesApi.remove(id),
    onSuccess: invalidate,
  });
}
