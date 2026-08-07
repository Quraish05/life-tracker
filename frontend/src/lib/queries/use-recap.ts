import { useCallback, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { recapApi } from "@/lib/recap";

export const recapKey = ["recap", "weekly"] as const;

/** The user's latest week-in-review (null until first generated). */
export function useWeeklyRecap() {
  return useQuery({
    queryKey: recapKey,
    queryFn: () => recapApi.getWeekly(),
  });
}

/** Live phase of an in-flight refresh, surfaced so the card can show the flow. */
export type RefreshPhase = "idle" | "queued" | "running" | "done" | "error";

const POLL_INTERVAL_MS = 1000;
// Give up after ~30s of polling. Without this cap, a job that never completes
// (e.g. the background worker isn't running) would poll forever, hammering the
// status endpoint — exactly the runaway we're guarding against.
const MAX_POLLS = 30;

/**
 * Refresh the recap via the background job runner, exposing the job's live
 * status. Enqueues, then polls until done/failed (or a timeout); on done it
 * refetches the stored recap so the card updates. The intermediate `phase` is
 * what makes the queued → running → done flow visible in the UI.
 */
export function useRefreshRecap() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<RefreshPhase>("idle");

  const refresh = useCallback(async () => {
    try {
      setPhase("queued");
      const { job_id } = await recapApi.refresh();

      let polls = 0;
      for (;;) {
        const status = await recapApi.jobStatus(job_id);
        if (status.status === "running") setPhase("running");
        if (status.status === "done") break;
        if (status.status === "failed") {
          setPhase("error");
          return;
        }
        if (++polls >= MAX_POLLS) {
          // Still queued/running after the cap — stop polling and surface it.
          setPhase("error");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      await queryClient.invalidateQueries({ queryKey: recapKey });
      setPhase("done");
      // Settle back to idle so the button returns to its resting label.
      setTimeout(() => setPhase("idle"), 1500);
    } catch {
      setPhase("error");
    }
  }, [queryClient]);

  return { refresh, phase };
}
