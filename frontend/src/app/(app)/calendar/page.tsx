"use client";

import { useMemo, useState } from "react";

import { useMeals } from "@/lib/use-meals";
import { useExercises } from "@/lib/use-exercises";
import {
  addMonths,
  formatMonthTitle,
  monthMatrix,
  monthRange,
  todayISO,
} from "@/components/calendar/_lib";
import { MonthGrid } from "@/components/calendar/month-grid";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { PageHeader } from "@/components/ui/molecules/page-header";

export default function CalendarPage() {
  const todayIso = todayISO();
  const [{ year, month }, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { start, end } = monthRange(year, month);
  const { data: meals = [] } = useMeals(start, end);
  const { data: exercises = [] } = useExercises(start, end);
  const weeks = useMemo(() => monthMatrix(year, month), [year, month]);

  const mealCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const meal of meals) {
      counts.set(meal.log_date, (counts.get(meal.log_date) ?? 0) + 1);
    }
    return counts;
  }, [meals]);

  const workoutDays = useMemo(
    () => new Set(exercises.map((ex) => ex.log_date)),
    [exercises],
  );

  function goToday() {
    const d = new Date();
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Your day, logged"
        title={
          <>
            Meal &amp; workout <AccentText>calendar</AccentText>
          </>
        }
        subtitle="Pick a day to log what you ate and how you moved."
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-ink">
            {formatMonthTitle(year, month)}
          </h2>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-ink/70 transition hover:bg-white hover:text-grape"
          >
            Today
          </button>
        </div>
        <div className="flex gap-1">
          <IconButton
            size="md"
            aria-label="Previous month"
            onClick={() => setView(addMonths(year, month, -1))}
          >
            ←
          </IconButton>
          <IconButton
            size="md"
            aria-label="Next month"
            onClick={() => setView(addMonths(year, month, 1))}
          >
            →
          </IconButton>
        </div>
      </div>

      <MonthGrid
        weeks={weeks}
        mealCounts={mealCounts}
        workoutDays={workoutDays}
        todayIso={todayIso}
      />
    </div>
  );
}
