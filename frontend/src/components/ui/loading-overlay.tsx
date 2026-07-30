"use client";

import { useEffect, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";

import { Spinner } from "@/components/ui/atoms/spinner";

/**
 * Full-screen, semi-transparent overlay shown while any React Query mutation is
 * in flight — i.e. every create/update/delete across the app. Reads/refetches
 * are intentionally ignored so routine background fetches don't flash a modal.
 *
 * Mounted once (in Providers). Sits above modals (highest modal z is `z-[60]`)
 * so it also covers CRUD triggered from inside a dialog.
 */
export function LoadingOverlay() {
  const isMutating = useIsMutating() > 0;
  // Only reveal after a short beat so fast saves don't cause a jarring flash.
  const visible = useDelayed(isMutating, 150);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Working"
      className="fixed inset-0 z-[80] flex animate-fade-in items-center justify-center bg-ink/40"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
        <Spinner className="size-6" aria-hidden />
        <span className="text-sm font-semibold text-foreground">Working…</span>
      </div>
    </div>
  );
}

/**
 * Mirror `active`, but delay the `false -> true` edge by `ms` (the `-> false`
 * edge is immediate). Keeps brief operations from flashing the overlay.
 */
function useDelayed(active: boolean, ms: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // When inactive there's nothing to schedule; the previous effect's cleanup
    // has already flipped `on` back to false.
    if (!active) return;
    const t = setTimeout(() => setOn(true), ms);
    return () => {
      clearTimeout(t);
      setOn(false);
    };
  }, [active, ms]);
  return on;
}
