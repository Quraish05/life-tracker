import { ApiError, request, tokenStore } from "@/lib/api";
import type { ExerciseInput } from "@/lib/validations/exercise";

/**
 * Exercises data layer — a thin client over the backend `exercises` API.
 * Consumed through the React Query hooks in `lib/use-exercises.ts`.
 */

export type ExerciseLog = {
  id: number;
  log_date: string;
  name: string;
  note: string | null;
  created_at: string;
};

function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const exercisesApi = {
  list: (start: string, end: string): Promise<ExerciseLog[]> =>
    request<ExerciseLog[]>(`/exercises?start=${start}&end=${end}`, {
      token: authToken(),
    }),

  create: (input: ExerciseInput): Promise<ExerciseLog> =>
    request<ExerciseLog>("/exercises", {
      method: "POST",
      body: input,
      token: authToken(),
    }),

  update: (
    id: number,
    patch: { name?: string; note?: string | null },
  ): Promise<ExerciseLog> =>
    request<ExerciseLog>(`/exercises/${id}`, {
      method: "PATCH",
      body: patch,
      token: authToken(),
    }),

  remove: (id: number): Promise<void> =>
    request<void>(`/exercises/${id}`, { method: "DELETE", token: authToken() }),
};
