"use client";

import Link from "next/link";

import { type DayCell, WEEKDAYS } from "@/components/calendar/_lib";

type Props = {
  weeks: DayCell[][];
  /** iso date → number of meals logged that day. */
  mealCounts: Map<string, number>;
  /** iso dates that have at least one exercise logged. */
  workoutDays: Set<string>;
  /** iso dates that have at least one journal entry. */
  journalDays: Set<string>;
  /** iso dates that have at least one reminder. */
  reminderDays: Set<string>;
  todayIso: string;
};

export function MonthGrid({
  weeks,
  mealCounts,
  workoutDays,
  journalDays,
  reminderDays,
  todayIso,
}: Props) {
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold uppercase tracking-wide text-muted/70"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weeks.flat().map((cell) => {
          const count = mealCounts.get(cell.iso) ?? 0;
          const trained = workoutDays.has(cell.iso);
          const journaled = journalDays.has(cell.iso);
          const reminded = reminderDays.has(cell.iso);
          const hasActivity = count > 0 || trained || journaled || reminded;
          const isToday = cell.iso === todayIso;
          return (
            <Link
              key={cell.iso}
              href={`/calendar/${cell.iso}`}
              className={`group flex min-h-[4.5rem] flex-col rounded-2xl border p-2 transition tablet:min-h-20 ${
                cell.inMonth
                  ? "border-border/60 bg-surface/70 hover:-translate-y-0.5 hover:shadow-md"
                  : "border-transparent bg-surface/30"
              } ${isToday ? "ring-2 ring-grape" : ""}`}
            >
              <span
                className={`text-sm font-semibold ${
                  isToday
                    ? "text-grape"
                    : cell.inMonth
                      ? "text-foreground"
                      : "text-muted/40"
                }`}
              >
                {cell.date.getDate()}
              </span>

              {cell.inMonth && hasActivity && (
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                  {count > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-lilac/40 px-1.5 py-0.5 text-[11px] font-semibold text-grape-deep">
                      🍽️ {count}
                    </span>
                  )}
                  {trained && <span className="text-[11px]">💪</span>}
                  {journaled && <span className="text-[11px]">📓</span>}
                  {reminded && <span className="text-[11px]">🔔</span>}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
