"use client";

import { useMemo } from "react";

import type { HealthGoal } from "@/types/health-goal";
import { useExercises } from "@/lib/queries/use-exercises";
import { useFoods } from "@/lib/queries/use-food";
import { useMeals } from "@/lib/queries/use-meals";
import { todayISO } from "@/components/calendar/_lib";
import { Button } from "@/components/ui/atoms/button";
import { Card } from "@/components/ui/atoms/card";
import {
  deriveGoalTitle,
  dayOfN,
  foodMap,
  goalEmoji,
  lastNDays,
  tallyMeals,
  weightRemaining,
} from "@/components/goal/_lib";

/** The hero card: the goal, a time-based progress bar, and today's tally so far. */
export function FocusGoalCard({
  goal,
  onEdit,
}: {
  goal: HealthGoal;
  onEdit: () => void;
}) {
  const today = todayISO();
  const week = useMemo(() => lastNDays(7, today), [today]);
  const { data: meals = [] } = useMeals(today, today);
  const { data: foods = [] } = useFoods();
  const { data: weekExercises = [] } = useExercises(week[0], today);

  const progress = dayOfN(goal, today);
  const remaining = weightRemaining(goal);
  const tally = useMemo(() => tallyMeals(meals, foodMap(foods)), [meals, foods]);
  const sessions = useMemo(
    () => new Set(weekExercises.map((e) => e.log_date)).size,
    [weekExercises],
  );

  return (
    <Card tone="soft" padding="md" className="border-grape/30">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-grape/10 text-xl">
          {goalEmoji(goal.goal_type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-grape px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-on-accent">
              Current health goal
            </span>
            {progress && (
              <span className="text-[11px] text-muted">
                Day {progress.day} of {progress.total}
              </span>
            )}
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
            {deriveGoalTitle(goal)}
          </h2>
          {goal.note && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{goal.note}</p>
          )}
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          {goal.current_weight_kg != null && (
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {goal.current_weight_kg} kg
            </p>
          )}
          {remaining && (
            <p className="text-[11px] text-muted">
              {remaining.kg} kg {remaining.verb}
            </p>
          )}
          <Button variant="secondary" size="sm" className="mt-1" onClick={onEdit}>
            Edit goal
          </Button>
        </div>
      </div>

      {/* Time progress */}
      {progress && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-grape/15">
            <div
              className="h-full rounded-full bg-grape transition-[width] duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>Started</span>
            <span className="font-bold text-grape">{progress.pct}% through</span>
            <span>
              {goal.timeframe_weeks} {goal.timeframe_weeks === 1 ? "week" : "weeks"}
            </span>
          </div>
        </div>
      )}

      {/* Today so far — all real tallies, no fabricated targets */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <TodayTile label="Calories today" value={tally.calories ? `${tally.calories}` : "—"} unit="kcal" />
        <TodayTile label="Protein today" value={tally.protein ? `${tally.protein}` : "—"} unit="g" />
        <TodayTile label="Sessions" value={`${sessions}`} unit="this week" />
      </div>
    </Card>
  );
}

function TodayTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
      <p className="mt-1 text-[15px] font-bold text-foreground">
        {value} <span className="text-[11px] font-medium text-muted">{unit}</span>
      </p>
    </div>
  );
}
