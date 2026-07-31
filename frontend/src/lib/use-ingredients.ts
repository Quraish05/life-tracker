import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { ingredientsApi } from "@/lib/ingredients";
import type { Ingredient } from "@/types/ingredient";
import type { IngredientInput } from "@/lib/validations/ingredient";

/** Single cache key for the pantry list — mutations invalidate it to refetch. */
export const ingredientsKey = ["ingredients"] as const;

/** The current user's pantry ingredients, cached and kept fresh across the app. */
export function useIngredients() {
  return useQuery({ queryKey: ingredientsKey, queryFn: ingredientsApi.list });
}

/** Shared success handler: pull the freshly-changed list back from the server. */
function useInvalidateIngredients() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ingredientsKey });
}

export function useCreateIngredient(): UseMutationResult<
  Ingredient,
  Error,
  IngredientInput
> {
  const invalidate = useInvalidateIngredients();
  return useMutation({
    mutationFn: (input: IngredientInput) => ingredientsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateIngredient(): UseMutationResult<
  Ingredient,
  Error,
  { id: number; input: Partial<IngredientInput> }
> {
  const invalidate = useInvalidateIngredients();
  return useMutation({
    mutationFn: ({ id, input }) => ingredientsApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteIngredient(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateIngredients();
  return useMutation({
    mutationFn: (id: number) => ingredientsApi.remove(id),
    onSuccess: invalidate,
  });
}
