import { ApiError, request, tokenStore } from "@/lib/api";
import type { RecapJobStatus, WeeklyRecap } from "@/types/recap";

/**
 * Week-in-review data layer. The recap is precomputed server-side (by the
 * scheduled Monday job or a previous refresh) and stored one-per-user, so
 * `getWeekly` is instant. `refresh` enqueues a background job and returns a job
 * id to poll via `jobStatus` — the live queued → running → done flow. Pure
 * aggregation, so refreshing never spends an AI credit.
 */

function authToken(): string {
  const token = tokenStore.get();
  if (!token) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return token;
}

export const recapApi = {
  /** The user's latest stored recap, or null if none has been generated yet. */
  getWeekly: (): Promise<WeeklyRecap | null> =>
    request<WeeklyRecap | null>("/recap/weekly", { token: authToken() }),

  /** Kick off a background recompute; returns a job id to poll. */
  refresh: (): Promise<RecapJobStatus> =>
    request<RecapJobStatus>("/recap/weekly/refresh", {
      method: "POST",
      token: authToken(),
    }),

  /** Poll a recap-refresh job's status. */
  jobStatus: (jobId: number): Promise<RecapJobStatus> =>
    request<RecapJobStatus>(`/recap/weekly/status/${jobId}`, { token: authToken() }),
};
