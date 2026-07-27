"use client";

import Link from "next/link";

import { type DayCell, WEEKDAYS } from "@/components/calendar/_lib";

type Props = {
  weeks: DayCell[][];
  /** iso date → number of meals logged that day. */
  mealCounts: Map<string, number>;
  /** iso dates that have at least one exercise logged. */
  workoutDays: Set<string>;
  todayIso: string;
};

export function MonthGrid({ weeks, mealCounts, workoutDays, todayIso }: Props) {
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold uppercase tracking-wide text-ink-soft/70"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weeks.flat().map((cell) => {
          const count = mealCounts.get(cell.iso) ?? 0;
          const trained = workoutDays.has(cell.iso);
          const isToday = cell.iso === todayIso;
          return (
            <Link
              key={cell.iso}
              href={`/calendar/${cell.iso}`}
              className={`group flex min-h-[4.5rem] flex-col rounded-2xl border p-2 transition tablet:min-h-20 ${
                cell.inMonth
                  ? "border-white/60 bg-white/70 hover:-translate-y-0.5 hover:shadow-md"
                  : "border-transparent bg-white/30"
              } ${isToday ? "ring-2 ring-grape" : ""}`}
            >
              <span
                className={`text-sm font-semibold ${
                  isToday
                    ? "text-grape"
                    : cell.inMonth
                      ? "text-ink"
                      : "text-ink-soft/40"
                }`}
              >
                {cell.date.getDate()}
              </span>

              {cell.inMonth && (count > 0 || trained) && (
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                  {count > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-lilac/40 px-1.5 py-0.5 text-[11px] font-semibold text-grape-deep">
                      🍽️ {count}
                    </span>
                  )}
                  {trained && <span className="text-[11px]">💪</span>}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
