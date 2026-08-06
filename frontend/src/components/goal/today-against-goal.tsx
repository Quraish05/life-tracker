"use client";

import { useMemo } from "react";

import { useExercises } from "@/lib/queries/use-exercises";
import { useFoods } from "@/lib/queries/use-food";
import { useMeals } from "@/lib/queries/use-meals";
import { SLOTS, todayISO } from "@/components/calendar/_lib";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";
import { foodMap, mealMacros } from "@/components/goal/_lib";

const slotEmoji = (slot: string) => SLOTS.find((s) => s.key === slot)?.emoji ?? "🍽️";

/** A meal reads as low-protein when it carries calories but little protein per 100 kcal. */
function isLowProtein(calories: number, protein: number): boolean {
  return calories >= 150 && protein < calories * 0.05; // <5 g per 100 kcal
}

/** Today's logged meals + workouts, tallied against the goal (all deterministic). */
export function TodayAgainstGoal() {
  const today = todayISO();
  const { data: meals = [] } = useMeals(today, today);
  const { data: exercises = [] } = useExercises(today, today);
  const { data: foods = [] } = useFoods();
  const byId = useMemo(() => foodMap(foods), [foods]);

  const totals = useMemo(
    () =>
      meals.reduce(
        (acc, m) => {
          const { calories, protein } = mealMacros(m, byId);
          return { calories: acc.calories + calories, protein: acc.protein + protein };
        },
        { calories: 0, protein: 0 },
      ),
    [meals, byId],
  );

  const empty = meals.length === 0 && exercises.length === 0;

  return (
    <Card tone="glass" padding="md">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-foreground">Today, measured against the goal</h3>
        {!empty && (
          <span className="ml-auto text-[11px] text-muted">
            ~{totals.calories} kcal · ~{totals.protein} g protein
          </span>
        )}
      </div>

      {empty ? (
        <p className="mt-3 text-sm text-muted">
          Nothing logged today yet — log a meal or a workout and it&rsquo;ll show up here.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-1.5">
          {meals.map((m) => {
            const { calories, protein } = mealMacros(m, byId);
            const low = isLowProtein(calories, protein);
            return (
              <Row
                key={`m${m.id}`}
                icon={slotEmoji(m.slot)}
                name={m.food_name}
                edge={low ? "bg-butter" : "bg-mint"}
                detail={
                  calories
                    ? `${calories} kcal · ${protein} g protein`
                    : m.note || "no nutrition yet"
                }
                tag={low ? { label: "Low protein", tone: "danger" as const } : null}
              />
            );
          })}
          {exercises.map((e) => (
            <Row
              key={`e${e.id}`}
              icon="💪"
              name={e.name}
              edge="bg-mint"
              detail={e.note || "logged"}
              tag={{ label: "Movement", tone: "success" as const }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function Row({
  icon,
  name,
  detail,
  edge,
  tag,
}: {
  icon: string;
  name: string;
  detail: string;
  edge: string;
  tag: { label: string; tone: "success" | "danger" } | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2.5">
      <span aria-hidden className={`h-8 w-0.5 flex-none rounded-full ${edge}`} />
      <span className="text-sm">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
        {name}
      </span>
      <span className="text-[11px] text-muted">{detail}</span>
      {tag && (
        <Chip tone={tag.tone} size="sm">
          {tag.label}
        </Chip>
      )}
    </div>
  );
}
