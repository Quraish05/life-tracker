"use client";

import { useMemo } from "react";
import Link from "next/link";

import { useDishes } from "@/lib/use-dishes";
import { useMeals } from "@/lib/use-meals";
import { useExercises } from "@/lib/use-exercises";
import { useNotes } from "@/lib/use-notes";
import { useReminders } from "@/lib/use-reminders";
import { todayISO, weekRange } from "@/components/calendar/_lib";
import { reminderStatus } from "@/components/reminders/_lib";
import { JourneyMap } from "@/components/journey/journey-map";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Button } from "@/components/ui/atoms/button";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";
import { IconTile } from "@/components/ui/atoms/icon-tile";
import { PageHeader } from "@/components/ui/molecules/page-header";

export default function DashboardPage() {
  const today = todayISO();
  const week = useMemo(() => weekRange(today), [today]);

  const { data: dishes = [] } = useDishes();
  const { data: meals = [] } = useMeals(week.start, week.end);
  const { data: exercises = [] } = useExercises(week.start, week.end);
  const { data: notes = [] } = useNotes();
  const { data: reminders = [] } = useReminders();

  // Today at a glance.
  const mealsToday = meals.filter((m) => m.log_date === today).length;
  const trainedToday = exercises.some((e) => e.log_date === today);
  const journaledToday = notes.some(
    (n) => n.kind === "journal" && n.entry_date === today,
  );

  // This week's numbers (meals/exercises are already fetched for the week range).
  const journalThisWeek = notes.filter(
    (n) =>
      n.kind === "journal" &&
      n.entry_date &&
      n.entry_date >= week.start &&
      n.entry_date <= week.end,
  ).length;
  const workoutDaysThisWeek = new Set(exercises.map((e) => e.log_date)).size;
  const remindersPending = reminders.filter(
    (r) => reminderStatus(r) !== "delivered",
  ).length;

  const weekStats = [
    { label: "Meals logged", value: meals.length, emoji: "🍽️", bg: "bg-peach" },
    { label: "Workout days", value: workoutDaysThisWeek, emoji: "💪", bg: "bg-mint" },
    { label: "Journal entries", value: journalThisWeek, emoji: "📓", bg: "bg-sky" },
    { label: "Reminders due", value: remindersPending, emoji: "🔔", bg: "bg-butter" },
    { label: "Dishes in library", value: dishes.length, emoji: "🍲", bg: "bg-blush" },
  ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        className="mb-8"
        eyebrow={todayLabel}
        title={
          <>
            Your week <AccentText>at a glance</AccentText>
          </>
        }
        subtitle="Here's how your logging is looking this week."
      />

      {/* Today */}
      <Card tone="soft" padding="md" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-grape">Today</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip tone="muted">
                🍽️ {mealsToday} meal{mealsToday === 1 ? "" : "s"}
              </Chip>
              <Chip tone={trainedToday ? "success" : "ghost"}>
                💪 {trainedToday ? "Trained" : "No workout"}
              </Chip>
              <Chip tone={journaledToday ? "muted" : "ghost"}>
                📓 {journaledToday ? "Journaled" : "No entry"}
              </Chip>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/calendar/${today}`}>Open today →</Link>
          </Button>
        </div>
      </Card>

      {/* Getting-started journey (hides once complete) */}
      <JourneyMap />

      {/* This week */}
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft/70">
        This week
      </p>
      <section className="grid grid-cols-2 gap-4 tablet:grid-cols-3 laptop:grid-cols-5">
        {weekStats.map((stat) => (
          <Card
            key={stat.label}
            tone="plain"
            padding="md"
            interactive
            className={stat.bg}
          >
            <IconTile size="md" tone="white">
              {stat.emoji}
            </IconTile>
            <p className="mt-4 text-sm font-medium text-ink/70">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-ink">{stat.value}</p>
          </Card>
        ))}
      </section>

      <p className="mt-6 text-sm text-ink-soft">
        Jump into the{" "}
        <Link
          href="/calendar"
          className="font-semibold text-grape underline underline-offset-2 hover:text-grape-deep"
        >
          calendar
        </Link>{" "}
        to log a day, or browse your{" "}
        <Link
          href="/dishes"
          className="font-semibold text-grape underline underline-offset-2 hover:text-grape-deep"
        >
          dishes
        </Link>
        .
      </p>
    </div>
  );
}
