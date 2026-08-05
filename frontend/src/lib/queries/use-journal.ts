import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { journalApi } from "@/lib/journal";
import type { AskJournalResponse } from "@/types/journal";

/** On-demand RAG question over the journal (button-triggered, mirrors useDailySummary). */
export function useAskJournal(): UseMutationResult<AskJournalResponse, Error, string> {
  return useMutation({ mutationFn: (question: string) => journalApi.ask(question) });
}
