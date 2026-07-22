import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { notesApi, type Note } from "@/lib/notes";
import type { NoteInput } from "@/lib/validations/note";

/** Single cache key for the notes list — mutations invalidate it to refetch. */
export const notesKey = ["notes"] as const;

/** The current user's notes, cached and kept fresh across the app. */
export function useNotes() {
  return useQuery({ queryKey: notesKey, queryFn: notesApi.list });
}

/** Shared success handler: pull the freshly-changed list back from the server. */
function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: notesKey });
}

export function useCreateNote(): UseMutationResult<Note, Error, NoteInput> {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (input: NoteInput) => notesApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateNote(): UseMutationResult<
  Note,
  Error,
  { id: number; input: NoteInput }
> {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, input }) => notesApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useTogglePin(): UseMutationResult<Note, Error, number> {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: number) => notesApi.togglePin(id),
    onSuccess: invalidate,
  });
}

export function useDeleteNote(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: number) => notesApi.remove(id),
    onSuccess: invalidate,
  });
}
