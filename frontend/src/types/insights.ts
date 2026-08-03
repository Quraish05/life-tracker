/**
 * Insights domain types — AI summaries over a day's logs.
 * Calorie figures are rough estimates the model derives from free text.
 */

export type Assessment = "on_track" | "off_track" | "no_data";

/** The AI's structured output for a day, including an editable prose `narrative`. */
export type DailySummary = {
  calories_in: number;
  calories_out: number;
  target_calories: number | null;
  assessment: Assessment;
  headline: string;
  tip: string;
  /** A short prose recap — seeds the editable day-summary textarea. */
  narrative: string;
};

export type DailySummaryResponse = {
  /** Which model produced this — surfaced for transparency. */
  model: string;
  summary: DailySummary;
};

/**
 * A saved day summary. `note` is the editable free text (typed or AI-drafted)
 * and is the primary field; the calorie/assessment fields are an optional AI
 * snapshot, present only when the note came from a generation.
 */
export type SavedSummary = {
  id: number;
  summary_date: string;
  note: string | null;
  calories_in: number | null;
  calories_out: number | null;
  target_calories: number | null;
  assessment: Assessment | null;
  headline: string | null;
  tip: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
};

/** Payload to persist a day's summary — `note` alone for a hand-typed one. */
export type SaveSummaryInput = {
  summary_date: string;
  note?: string | null;
  calories_in?: number | null;
  calories_out?: number | null;
  target_calories?: number | null;
  assessment?: Assessment | null;
  headline?: string | null;
  tip?: string | null;
  model?: string | null;
};
