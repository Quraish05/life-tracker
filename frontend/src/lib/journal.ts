import { ApiError, request, tokenStore } from "@/lib/api";
import type { AskJournalResponse } from "@/types/journal";

/**
 * Journal data layer — the "Ask my journal" RAG endpoint. Hybrid retrieval over
 * the user's entries produces a grounded, cited answer.
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
};
