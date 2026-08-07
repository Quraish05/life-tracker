"use client";

import { useMemo } from "react";
import Link from "next/link";

import { useMeals } from "@/lib/queries/use-meals";
import { lastNDays } from "@/components/goal/_lib";
import { todayISO } from "@/components/calendar/_lib";
import { Card } from "@/components/ui/atoms/card";

const SLOT_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/**
 * Recent meal entries — real logs, newest first. Deliberately no calorie column:
 * meals are free-text with no portion size, so a kcal number here would be
 * invented. We show the time, the food, its slot, and any portion note instead.
 */
export function RecentEntries() {
  const today = todayISO();
  const days = useMemo(() => lastNDays(7, today), [today]);
  const { data: meals = [] } = useMeals(days[0], today);

  const recent = useMemo(
    () =>
      [...meals]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6),
    [meals],
  );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
          Recent entries
        </p>
        <Link
          href="/food"
          className="text-xs font-semibold text-grape underline-offset-2 hover:underline"
        >
          View all →
        </Link>
      </div>

      <Card tone="soft" padding="none">
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Nothing logged in the last 7 days.{" "}
            <Link href="/log" className="font-semibold text-grape hover:underline">
              Log a meal →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {recent.map((meal) => (
              <li
                key={meal.id}
                className="flex items-center gap-4 px-5 py-3.5 first:rounded-t-2xl last:rounded-b-2xl"
              >
                <span className="w-14 shrink-0 text-xs font-medium tabular-nums text-muted">
                  {timeLabel(meal.created_at)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {meal.food_name}
                  </p>
                  {meal.note && <p className="truncate text-xs text-muted">{meal.note}</p>}
                </div>
                <span className="shrink-0 text-xs font-medium text-muted">
                  {SLOT_LABEL[meal.slot] ?? meal.slot}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
