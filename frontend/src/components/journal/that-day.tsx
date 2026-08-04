"use client";

import { useMemo } from "react";

import { useMeals } from "@/lib/queries/use-meals";
import { useExercises } from "@/lib/queries/use-exercises";
import { useFoods } from "@/lib/queries/use-food";
import { SLOTS } from "@/components/calendar/_lib";

const SLOT_EMOJI: Record<string, string> = Object.fromEntries(
  SLOTS.map((s) => [s.key, s.emoji]),
);

type Row = { key: string; icon: string; wash: string; text: string };

/**
 * "That day" — what was logged on a journal entry's date: meals (with calories
 * joined from the foods list, since a MealLog only snapshots the food name) and
 * workouts (free-text name + note; there's no structured duration to sum).
 * Renders nothing but a muted line when the day is empty.
 *
 * `variant`:
 * - `sidebar` (default) — a single narrow column, for the drawer and the
 *   reader's right rail on laptop+.
 * - `stacked` — a responsive grid (one column on phones, two from tablet up),
 *   matching the small-screen reader where "that day" sits under the prose.
 */
export function ThatDay({
  date,
  variant = "sidebar",
}: {
  date: string;
  variant?: "sidebar" | "stacked";
}) {
  const { data: meals = [] } = useMeals(date, date);
  const { data: exercises = [] } = useExercises(date, date);
  const { data: foods = [] } = useFoods();

  const rows = useMemo<Row[]>(() => {
    const calById = new Map(foods.map((f) => [f.id, f.calories]));
    const mealRows: Row[] = meals.map((m) => {
      const cal = m.food_id != null ? calById.get(m.food_id) : null;
      return {
        key: `m${m.id}`,
        icon: SLOT_EMOJI[m.slot] ?? "🍽️",
        wash: "bg-peach/40",
        text: cal != null ? `${cal} · ${m.food_name}` : m.food_name,
      };
    });
    const exRows: Row[] = exercises.map((e) => ({
      key: `e${e.id}`,
      icon: "🏋️",
      wash: "bg-sky/50",
      text: e.note ? `${e.name} · ${e.note}` : e.name,
    }));
    return [...mealRows, ...exRows];
  }, [meals, exercises, foods]);

  return (
    <div>
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
        That day
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">Nothing logged for this day.</p>
      ) : (
        <div
          className={
            variant === "stacked"
              ? "grid grid-cols-1 gap-1.5 tablet:grid-cols-2 laptop:grid-cols-1"
              : "flex flex-col gap-1.5"
          }
        >
          {rows.map((r) => (
            <div
              key={r.key}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2"
            >
              <span
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-md text-sm ${r.wash}`}
              >
                {r.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                {r.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
