"use client";

import { useMemo } from "react";

import type { Assessment } from "@/types/insights";
import { useSummaries } from "@/lib/queries/use-insights";
import { parseISODate, todayISO } from "@/components/calendar/_lib";
import { Card } from "@/components/ui/atoms/card";
import { lastNDays } from "@/components/goal/_lib";

/** Bar style per saved assessment — a tall accent for on-track, short coral for off. */
const BAR: Record<Assessment | "none", { h: string; cls: string }> = {
  on_track: { h: "h-full", cls: "bg-grape" },
  off_track: { h: "h-2/5", cls: "bg-coral" },
  no_data: { h: "h-1/5", cls: "bg-grape/20" },
  none: { h: "h-1/5", cls: "bg-grape/15" },
};

const dow = (iso: string) =>
  parseISODate(iso).toLocaleDateString(undefined, { weekday: "narrow" });

/**
 * "Seven days of alignment" — deterministic, from saved daily summaries. A day
 * only has a bar's colour if a summary was saved that day; unsaved days show a
 * faint placeholder (a documented gap, not fabricated data).
 */
export function AlignmentBars() {
  const today = todayISO();
  const days = useMemo(() => lastNDays(7, today), [today]);
  const { data: summaries = [] } = useSummaries(days[0], today);

  const byDate = useMemo(() => {
    const map = new Map<string, Assessment | null>();
    for (const s of summaries) map.set(s.summary_date, s.assessment);
    return map;
  }, [summaries]);

  const anySaved = summaries.length > 0;

  return (
    <Card tone="glass" padding="md">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
        Seven days of alignment
      </p>
      <div className="mt-3 flex h-[70px] items-end gap-1.5">
        {days.map((iso) => {
          const a = byDate.get(iso);
          const style = BAR[a ?? "none"];
          return (
            <div key={iso} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-[52px] w-full items-end">
                <div className={`w-full rounded-md ${style.h} ${style.cls}`} />
              </div>
              <span className="text-[10px] font-bold text-muted">{dow(iso)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted/80">
        {anySaved
          ? "From the day summaries you've saved. Days without one stay faint."
          : "Save a day summary from the Log page and these fill in."}
      </p>
    </Card>
  );
}
