"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useSummaries } from "@/lib/use-insights";
import { monthRange, parseISODate, weekRange } from "@/components/calendar/_lib";
import { ASSESSMENT_META } from "@/components/calendar/day-summary";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { PageHeader } from "@/components/ui/molecules/page-header";

type Period = "week" | "month";

function shortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ProgressPage() {
  const [period, setPeriod] = useState<Period>("week");

  const range = useMemo(() => {
    if (period === "week") return weekRange();
    const now = new Date();
    return monthRange(now.getFullYear(), now.getMonth());
  }, [period]);

  const { data: summaries = [], isLoading } = useSummaries(range.start, range.end);

  const rollup = useMemo(() => {
    const withData = summaries.filter((s) => s.assessment !== "no_data");
    const onTrack = summaries.filter((s) => s.assessment === "on_track").length;
    const offTrack = summaries.filter((s) => s.assessment === "off_track").length;
    const avg = (pick: (s: (typeof summaries)[number]) => number) =>
      withData.length
        ? Math.round(withData.reduce((sum, s) => sum + pick(s), 0) / withData.length)
        : 0;
    return {
      onTrack,
      offTrack,
      avgIn: avg((s) => s.calories_in),
      avgOut: avg((s) => s.calories_out),
    };
  }, [summaries]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Progress"
        title={
          <>
            Your <AccentText>progress</AccentText> over time
          </>
        }
        subtitle="Saved daily summaries — how your logging has tracked against your goal."
      />

      <div className="mb-6 flex rounded-full bg-surface/60 p-1 shadow-sm w-fit">
        {(["week", "month"] as const).map((p) => (
          <Chip
            key={p}
            asChild
            interactive
            size="lg"
            tone={period === p ? "solid" : "ghost"}
          >
            <button type="button" onClick={() => setPeriod(p)}>
              This {p}
            </button>
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : summaries.length === 0 ? (
        <EmptyState
          icon="📈"
          title={
            <>
              Nothing <AccentText tone="grape">saved yet</AccentText>
            </>
          }
          description="Open a day on the calendar, summarize it, and hit “Save to progress” to start tracking."
        />
      ) : (
        <>
          {/* Rollup */}
          <Card tone="soft" padding="md" className="mb-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {rollup.onTrack}
                  <span className="text-sm font-medium text-muted">
                    {" "}
                    on track
                  </span>
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {rollup.offTrack}
                  <span className="text-sm font-medium text-muted"> off track</span>
                </p>
              </div>
              <div className="text-sm text-muted">
                avg 🔥 ~{rollup.avgIn} in · ~{rollup.avgOut} out
              </div>
            </div>
          </Card>

          {/* List */}
          <ul className="space-y-2">
            {summaries.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/calendar/${s.summary_date}`}
                  className="group flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-surface/70 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground group-hover:text-grape">
                      {shortDate(s.summary_date)}
                    </span>
                    <Chip tone={ASSESSMENT_META[s.assessment].tone} size="sm">
                      {ASSESSMENT_META[s.assessment].label}
                    </Chip>
                    <span className="text-sm text-muted">
                      🔥 ~{s.calories_in} in · ~{s.calories_out} out
                      {s.target_calories != null && <> · target ~{s.target_calories}</>}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{s.headline}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
