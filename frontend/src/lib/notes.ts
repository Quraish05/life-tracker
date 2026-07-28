import { ApiError, request, tokenStore } from "@/lib/api";
import type { NoteInput } from "@/lib/validations/note";
import type { FollowUpSuggestions, Note, TagSuggestions } from "@/types/note";

/**
 * Journal / Notes data layer — a thin client over the backend `notes` API.
 * Consumed through the React Query hooks in `lib/use-notes.ts`.
 */

/** Fewest meaningful words before AI follow-up extraction is worth running. */
export const MIN_FOLLOW_UP_WORDS = 6;

/** Fewest meaningful words before AI tag suggestion is worth running. */
export const MIN_TAG_WORDS = 4;

/**
 * A cheap, local gate (no API call) for whether a note has enough substance to
 * extract follow-ups from. Prevents wasted cost — and a confusing empty/error
 * result — on thin notes like an untouched "New note". The backend applies the
 * same floor as defense-in-depth.
 */
export function canSuggestFollowUps(note: Pick<Note, "title" | "body_md">): boolean {
  return wordCount(`${note.title} ${note.body_md}`) >= MIN_FOLLOW_UP_WORDS;
}

/**
 * Local gate (no API call) for whether draft text has enough substance to tag.
 * Takes raw strings — unlike follow-ups, tag suggestions run on the live editor
 * draft, which may not be a saved Note yet. The backend applies the same floor.
 */
export function canSuggestTags(title: string, body: string): boolean {
  return wordCount(`${title} ${body}`) >= MIN_TAG_WORDS;
}

/** Whitespace-delimited word count — the shared basis for the AI content gates. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Grab the current token, or fail loudly rather than hit the API unauthenticated. */
function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const notesApi = {
  list: (): Promise<Note[]> => request<Note[]>("/notes", { token: authToken() }),

  /** Ask the AI to propose reminders implied by a note. Creates nothing. */
  suggestFollowUps: (id: number): Promise<FollowUpSuggestions> =>
    request<FollowUpSuggestions>(`/notes/${id}/follow-up-suggestions`, {
      method: "POST",
      token: authToken(),
    }),

  /**
   * Ask the AI to propose topic tags for *draft* text (title + body). Sends the
   * live content rather than a note id, so it works while writing and on unsaved
   * entries. Creates nothing — the caller applies the tags the user picks.
   */
  suggestTags: (input: { title: string; body_md: string }): Promise<TagSuggestions> =>
    request<TagSuggestions>("/notes/tag-suggestions", {
      method: "POST",
      body: input,
      token: authToken(),
    }),

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
