"use client";

import Link from "next/link";

import { useFoods } from "@/lib/queries/use-food";
import { useExercises } from "@/lib/queries/use-exercises";
import { useHealthGoal } from "@/lib/queries/use-health-goal";
import { useSummaries } from "@/lib/queries/use-insights";
import { useMeals } from "@/lib/queries/use-meals";
import { monthRange, weekRange } from "@/components/calendar/_lib";
import { JOURNEY_STEPS } from "@/components/journey/steps";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Card } from "@/components/ui/atoms/card";

/**
 * State-aware getting-started map for the dashboard: the five-step loop with
 * each step checked off from the user's real data. Hides itself once the whole
 * loop is done — it's onboarding, not permanent chrome.
 */
export function JourneyMap() {
  const week = weekRange();
  const now = new Date();
  const month = monthRange(now.getFullYear(), now.getMonth());

  const { data: goal } = useHealthGoal();
  const { data: foods = [] } = useFoods();
  const { data: meals = [] } = useMeals(week.start, week.end);
  const { data: exercises = [] } = useExercises(week.start, week.end);
  const { data: summaries = [] } = useSummaries(month.start, month.end);

  const done: Record<string, boolean> = {
    goal: goal != null,
    foods: foods.length > 0,
    log: meals.length > 0 || exercises.length > 0,
    summarize: summaries.length > 0,
    progress: summaries.length > 0,
  };
  const completed = JOURNEY_STEPS.filter((s) => done[s.key]).length;

  // Once the loop is complete, the map has done its job — get out of the way.
  if (completed === JOURNEY_STEPS.length) return null;

  return (
    <Card tone="glass" padding="md" className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-grape">Your journey</p>
          <p className="text-sm text-muted">
            A few steps to get the most out of <AccentText>Thyme</AccentText>.
          </p>
        </div>
        <span className="rounded-full bg-lilac/40 px-2.5 py-1 text-xs font-semibold text-grape-deep">
          {completed}/{JOURNEY_STEPS.length} done
        </span>
      </div>

      <ol className="grid grid-cols-1 gap-3 tablet:grid-cols-5">
        {JOURNEY_STEPS.map((step, i) => {
          const isDone = done[step.key];
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={`flex h-full flex-col rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${
                  isDone
                    ? "border-mint/60 bg-mint/20"
                    : "border-border/60 bg-surface/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isDone
                        ? "bg-grape text-white"
                        : "bg-lilac/50 text-grape-deep"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span className="text-lg">{step.icon}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted">{step.blurb}</p>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
