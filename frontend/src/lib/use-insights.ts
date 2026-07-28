import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { insightsApi } from "@/lib/insights";
import type {
  DailySummaryResponse,
  SavedSummary,
  SaveSummaryInput,
} from "@/types/insights";

/** On-demand AI summary of a day (button-triggered, mirrors useSuggestTags). */
export function useDailySummary(): UseMutationResult<
  DailySummaryResponse,
  Error,
  string
> {
  return useMutation({ mutationFn: (date: string) => insightsApi.dailySummary(date) });
}

/** Prefix key for saved-summary queries; save invalidates the whole prefix. */
export const summariesKey = ["summaries"] as const;

/** Saved summaries in [start, end], for the progress page. */
export function useSummaries(start: string, end: string) {
  return useQuery({
    queryKey: [...summariesKey, start, end],
    queryFn: () => insightsApi.listSummaries(start, end),
    enabled: Boolean(start && end),
  });
}

/** The saved summary for a single day, or null. */
export function useDaySummaryRecord(date: string) {
  return useQuery({
    queryKey: [...summariesKey, date, date],
    queryFn: async () => (await insightsApi.listSummaries(date, date))[0] ?? null,
    enabled: Boolean(date),
  });
}

export function useSaveSummary(): UseMutationResult<
  SavedSummary,
  Error,
  SaveSummaryInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveSummaryInput) => insightsApi.saveSummary(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: summariesKey }),
  });
}
