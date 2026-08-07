"use client";

import Link from "next/link";

import { todayISO } from "@/components/calendar/_lib";
import { JourneyMap } from "@/components/journey/journey-map";
import { WeekReviewHero } from "@/components/dashboard/week-review-hero";
import { UpNext } from "@/components/dashboard/up-next";
import { RecentEntries } from "@/components/dashboard/recent-entries";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Button } from "@/components/ui/atoms/button";

export default function DashboardPage() {
  const today = todayISO();
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            {todayLabel}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-foreground">
            Your week, <AccentText>in review</AccentText>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/calendar/${today}`}>Open today</Link>
          </Button>
          <Button asChild>
            <Link href="/log">+ Quick log</Link>
          </Button>
        </div>
      </header>

      {/* Hero (week in review) + Up next rail */}
      <div className="mb-6 flex flex-col gap-4 laptop:flex-row laptop:items-start">
        <WeekReviewHero />
        <UpNext />
      </div>

      {/* Getting-started journey (hides once complete) */}
      <JourneyMap />

      {/* Recent entries */}
      <RecentEntries />
    </div>
  );
}
