import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { notesApi } from "@/lib/notes";
import type { Note, TagSuggestions } from "@/types/note";
import type { NoteInput } from "@/lib/validations/note";

/** Single cache key for the notes list — mutations invalidate it to refetch. */
export const notesKey = ["notes"] as const;

/** The current user's notes, cached and kept fresh across the app. */
export function useNotes() {
  return useQuery({ queryKey: notesKey, queryFn: notesApi.list });
}

/**
 * Ranked full-text search over the user's notes. Only runs when there's a
 * (trimmed) query — the caller passes the *submitted* term (search fires on
 * Enter / the search button, not per keystroke) — and keeps the previous
 * results on screen while a new query loads.
 */
export function useNoteSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["notes", "search", q],
    queryFn: () => notesApi.search(q),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
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
  { id: number; input: Partial<NoteInput> }
> {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ id, input }) => notesApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useTogglePin(): UseMutationResult<
  Note,
  Error,
  { id: number; pinned: boolean }
> {
  const invalidate = useInvalidateNotes();
  return useMutation({
    // Pinning is just a one-field partial update.
    mutationFn: ({ id, pinned }) => notesApi.update(id, { pinned }),
    onSuccess: invalidate,
  });
}

/**
 * AI follow-up suggestions for a note. A query keyed by the note and its
 * `updated_at`, so it runs once when the modal opens, is deduped across
 * StrictMode's double-mount, cached (editing the note busts the key), and never
 * re-fetches on window focus — one billable call per open of an unchanged note.
 */
export function useFollowUpSuggestions(note: Note, enabled = true) {
  return useQuery({
    queryKey: ["notes", note.id, "follow-ups", note.updated_at],
    queryFn: () => notesApi.suggestFollowUps(note.id),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    // Skip the (guaranteed-429) call when the user's out of AI credits.
    enabled,
  });
}

/**
 * AI topic-tag suggestions for draft note text. A mutation (not a query)
 * because it runs on demand — when the user taps "Suggest tags" — against the
 * live editor content, and creates nothing. Applying a suggestion just fills the
 * note's own tag field, so there's no cache to invalidate.
 */
export function useSuggestTags(): UseMutationResult<
  TagSuggestions,
  Error,
  { title: string; body_md: string }
> {
  return useMutation({ mutationFn: (input) => notesApi.suggestTags(input) });
}

export function useDeleteNote(): UseMutationResult<void, Error, number> {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: number) => notesApi.remove(id),
    onSuccess: invalidate,
  });
}
