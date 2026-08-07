/** The deterministic "week in review" stats (no AI). Mirrors the backend
 * WeeklyRecapData schema. */
export type WeeklyRecapData = {
  streak_days: number;
  active_days: number;
  meals_logged: number;
  workouts_logged: number;
  journal_entries: number;
  top_mood: string | null;
};

/** A user's latest stored recap, precomputed on a schedule or on refresh. */
export type WeeklyRecap = {
  period_start: string;
  period_end: string;
  generated_at: string;
  data: WeeklyRecapData;
};

/** A pointer to a recap-refresh job, polled to show the live queued/running/done flow. */
export type RecapJobStatus = {
  job_id: number;
  status: "queued" | "running" | "done" | "failed";
};
