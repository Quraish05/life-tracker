import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { mealsApi } from "@/lib/meals";
import type { MealLog } from "@/types/meal";
import type { MealInput, MealSlot } from "@/lib/validations/meal";

/** Prefix key for every meals query — mutations invalidate the whole prefix so
 * both the month grid and a single day refresh together. */
export const mealsKey = ["meals"] as const;

/** Meals in [start, end]. Disabled until both bounds are known. */
export function useMeals(start: string, end: string) {
  return useQuery({
    queryKey: [...mealsKey, start, end],
    queryFn: () => mealsApi.list(start, end),
    enabled: Boolean(start && end),
  });
}

function useInvalidateMeals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: mealsKey });
}

export function useCreateMeal(): UseMutationResult<MealLog, Error, MealInput> {
  const invalidate = useInvalidateMeals();
  return useMutation({
    mutationFn: (input: MealInput) => mealsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateMeal(): UseMutationResult<
  MealLog,
  Error,
  { id: number; patch: { slot?: MealSlot; note?: string | null } }
> {
  const invalidate = useInvalidateMeals();
  return useMutation({
    mutationFn: ({ id, patch }) => mealsApi.update(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteMeal(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateMeals();
  return useMutation({
    mutationFn: (id: number) => mealsApi.remove(id),
    onSuccess: invalidate,
  });
}
