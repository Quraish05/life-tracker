import { ApiError, request, tokenStore } from "@/lib/api";
import type {
  AskJournalResponse,
  JournalInsight,
  SaveInsightPayload,
} from "@/types/journal";

/**
 * Journal data layer — the "Ask my journal" RAG endpoint plus saved insights
 * (Patterns). Hybrid retrieval produces a grounded, cited answer; a saved answer
 * is persisted as a finding the user can revisit and vote on.
 */

function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const journalApi = {
  /** Ask a natural-language question answered from your journal entries. */
  ask: (question: string): Promise<AskJournalResponse> =>
    request<AskJournalResponse>("/journal/ask", {
      method: "POST",
      body: { question },
      token: authToken(),
    }),

  /** Save an already-generated answer as a Patterns finding. */
  saveInsight: (payload: SaveInsightPayload): Promise<JournalInsight> =>
    request<JournalInsight>("/journal/insights", {
      method: "POST",
      body: payload,
      token: authToken(),
    }),

  /** List saved findings, newest first. */
  listInsights: (): Promise<JournalInsight[]> =>
    request<JournalInsight[]>("/journal/insights", { token: authToken() }),

  /** Record the "was this true for you?" vote (null clears it). */
  voteInsight: (id: number, helpful: boolean | null): Promise<JournalInsight> =>
    request<JournalInsight>(`/journal/insights/${id}`, {
      method: "PATCH",
      body: { helpful },
      token: authToken(),
    }),

  /** Delete a saved finding. */
  deleteInsight: (id: number): Promise<void> =>
    request<void>(`/journal/insights/${id}`, {
      method: "DELETE",
      token: authToken(),
    }),
};
