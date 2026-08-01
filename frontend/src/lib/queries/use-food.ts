import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { foodApi, type NutritionEstimateInput } from "@/lib/food";
import type { FoodItem, NutritionEstimate } from "@/types/food";
import type { FoodItemInput } from "@/lib/validations/food";

/** Single cache key for the foods list — mutations invalidate it to refetch. */
export const foodKey = ["foods"] as const;

/** Per-food activity cache key (count / top slot / recent logs). */
export const foodActivityKey = (id: number) => ["food-activity", id] as const;

/** The current user's foods, cached and kept fresh across the app. */
export function useFoods() {
  return useQuery({ queryKey: foodKey, queryFn: foodApi.list });
}

/** A single food's logging activity, fetched lazily when one is selected. */
export function useFoodActivity(id: number | null) {
  return useQuery({
    queryKey: foodActivityKey(id ?? 0),
    queryFn: () => foodApi.activity(id as number),
    enabled: id != null,
  });
}

/** Cache key for the "log again" rail of most-logged foods. */
export const frequentFoodKey = ["food-frequent"] as const;

/** The user's most-logged foods (with usual slot) for the log-again rail. */
export function useFrequentFoods() {
  return useQuery({ queryKey: frequentFoodKey, queryFn: foodApi.frequent });
}

/** Ask the AI to estimate a food's per-serving nutrition (proposes, doesn't save). */
export function useEstimateNutrition(): UseMutationResult<
  NutritionEstimate,
  Error,
  NutritionEstimateInput
> {
  return useMutation({
    mutationFn: (input: NutritionEstimateInput) => foodApi.estimateNutrition(input),
  });
}

/** Shared success handler: pull the freshly-changed list back from the server. */
function useInvalidateFoods() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: foodKey });
}

export function useCreateFood(): UseMutationResult<FoodItem, Error, FoodItemInput> {
  const invalidate = useInvalidateFoods();
  return useMutation({
    mutationFn: (input: FoodItemInput) => foodApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFood(): UseMutationResult<
  FoodItem,
  Error,
  { id: number; input: Partial<FoodItemInput> }
> {
  const invalidate = useInvalidateFoods();
  return useMutation({
    mutationFn: ({ id, input }) => foodApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteFood(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateFoods();
  return useMutation({
    mutationFn: (id: number) => foodApi.remove(id),
    onSuccess: invalidate,
  });
}
