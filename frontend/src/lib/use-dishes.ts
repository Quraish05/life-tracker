import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { dishesApi, type Dish } from "@/lib/dishes";
import type { DishInput } from "@/lib/validations/dish";

/** Single cache key for the dishes list — mutations invalidate it to refetch. */
export const dishesKey = ["dishes"] as const;

/** The current user's dishes, cached and kept fresh across the app. */
export function useDishes() {
  return useQuery({ queryKey: dishesKey, queryFn: dishesApi.list });
}

/** Shared success handler: pull the freshly-changed list back from the server. */
function useInvalidateDishes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: dishesKey });
}

export function useCreateDish(): UseMutationResult<Dish, Error, DishInput> {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: (input: DishInput) => dishesApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateDish(): UseMutationResult<
  Dish,
  Error,
  { id: number; input: Partial<DishInput> }
> {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: ({ id, input }) => dishesApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteDish(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateDishes();
  return useMutation({
    mutationFn: (id: number) => dishesApi.remove(id),
    onSuccess: invalidate,
  });
}
