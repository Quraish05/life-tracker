/**
 * Insights domain types — AI summaries over a day's logs.
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
