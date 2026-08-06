import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { journalApi } from "@/lib/journal";
import type {
  AskJournalResponse,
  JournalInsight,
  SaveInsightPayload,
} from "@/types/journal";

/** On-demand RAG question over the journal (button-triggered, mirrors useDailySummary). */
export function useAskJournal(): UseMutationResult<AskJournalResponse, Error, string> {
  return useMutation({ mutationFn: (question: string) => journalApi.ask(question) });
}

/** Prefix key for saved-insight queries; any write invalidates the whole prefix. */
export const insightsKey = ["journal-insights"] as const;

/** Saved findings for the Patterns page, newest first. */
export function useSavedInsights() {
  return useQuery({
    queryKey: insightsKey,
    queryFn: () => journalApi.listInsights(),
  });
}

/** Save an answer as a finding, then refresh the Patterns list. */
export function useSaveInsight(): UseMutationResult<
  JournalInsight,
  Error,
  SaveInsightPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveInsightPayload) => journalApi.saveInsight(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: insightsKey }),
  });
}

/** Record the "was this true for you?" vote on a finding. */
export function useVoteInsight(): UseMutationResult<
  JournalInsight,
  Error,
  { id: number; helpful: boolean | null }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, helpful }) => journalApi.voteInsight(id, helpful),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: insightsKey }),
  });
}

/** Delete a saved finding, then refresh the Patterns list. */
export function useDeleteInsight(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => journalApi.deleteInsight(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: insightsKey }),
  });
}
