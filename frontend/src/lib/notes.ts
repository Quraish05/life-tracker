import { ApiError, request, tokenStore } from "@/lib/api";
import type { MoodKey, NoteInput, NoteKind } from "@/lib/validations/note";

/**
 * Journal / Notes data layer — a thin client over the backend `notes` API.
 * Consumed through the React Query hooks in `lib/use-notes.ts`.
 */

export type Note = {
  id: number;
  kind: NoteKind;
  title: string;
  body_md: string;
  /** Present only for journal entries (YYYY-MM-DD). */
  entry_date: string | null;
  /** Hashtag-style slugs — normalized server-side. */
  tags: string[];
  /** Optional mood for journal entries. */
  mood: MoodKey | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

/** Grab the current token, or fail loudly rather than hit the API unauthenticated. */
function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const notesApi = {
  list: (): Promise<Note[]> => request<Note[]>("/notes", { token: authToken() }),

  create: (input: NoteInput): Promise<Note> =>
    request<Note>("/notes", { method: "POST", body: input, token: authToken() }),

  /**
   * Partially update a note — only the fields in `patch` change. Also used to
   * pin/unpin (`{ pinned }`); omitted fields keep their current value.
   */
  update: (id: number, patch: Partial<NoteInput>): Promise<Note> =>
    request<Note>(`/notes/${id}`, { method: "PATCH", body: patch, token: authToken() }),

  remove: (id: number): Promise<void> =>
    request<void>(`/notes/${id}`, { method: "DELETE", token: authToken() }),
};
