import { ApiError, request, tokenStore } from "@/lib/api";

/**
 * Insights data layer — AI summaries over the day's logs.
 * Calorie figures are rough estimates the model derives from free text.
 */

export type Assessment = "on_track" | "off_track" | "no_data";

export type DailySummary = {
  calories_in: number;
  calories_out: number;
  target_calories: number | null;
  assessment: Assessment;
  headline: string;
  tip: string;
};

export type DailySummaryResponse = {
  /** Which model produced this — surfaced for transparency. */
  model: string;
  summary: DailySummary;
};

/** A summary saved to the progress log. */
export type SavedSummary = DailySummary & {
  id: number;
  summary_date: string;
  model: string;
  created_at: string;
  updated_at: string;
};

/** Payload to persist a generated summary. */
export type SaveSummaryInput = DailySummary & {
  summary_date: string;
  model: string;
};

function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const insightsApi = {
  /** Generate (ephemeral) a day's summary via the AI. */
  dailySummary: (date: string): Promise<DailySummaryResponse> =>
    request<DailySummaryResponse>(`/insights/daily?date=${date}`, {
      method: "POST",
      token: authToken(),
    }),

  /** Save (upsert) a generated summary to the progress log. */
  saveSummary: (input: SaveSummaryInput): Promise<SavedSummary> =>
    request<SavedSummary>("/insights/summaries", {
      method: "PUT",
      body: input,
      token: authToken(),
    }),

  /** Saved summaries in a date range (newest day first). */
  listSummaries: (start: string, end: string): Promise<SavedSummary[]> =>
    request<SavedSummary[]>(`/insights/summaries?start=${start}&end=${end}`, {
      token: authToken(),
    }),
};
