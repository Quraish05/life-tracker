import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { foodApi } from "@/lib/food";
import type { FoodItem } from "@/types/food";
import type { FoodItemInput } from "@/lib/validations/food";

/** Single cache key for the foods list — mutations invalidate it to refetch. */
export const foodKey = ["foods"] as const;

/** The current user's foods, cached and kept fresh across the app. */
export function useFoods() {
  return useQuery({ queryKey: foodKey, queryFn: foodApi.list });
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
