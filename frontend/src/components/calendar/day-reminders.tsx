"use client";

import Link from "next/link";

import type { Reminder } from "@/lib/reminders";
import { Chip } from "@/components/ui/atoms/chip";
import { STATUS_META, reminderStatus } from "@/components/reminders/_lib";

type Props = {
  /** Reminders whose remind_at falls on this day, in time order. */
  reminders: Reminder[];
};

/** Just the time-of-day, e.g. "6:00 PM". */
function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Read-only summary of the day's reminders, linking out to the reminders page. */
export function DayReminders({ reminders }: Props) {
  if (reminders.length === 0) return null;

  return (
    <section className="rounded-3xl border border-white/60 bg-white/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">🔔</span>
        <h3 className="font-bold text-ink">Reminders</h3>
        <span className="rounded-full bg-lilac/40 px-2 py-0.5 text-xs font-semibold text-grape-deep">
          {reminders.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {reminders.map((reminder) => {
          const meta = STATUS_META[reminderStatus(reminder)];
          return (
            <li key={reminder.id}>
              <Link
                href="/reminders"
                className="group flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white"
              >
                <span className="shrink-0 text-sm font-semibold text-ink-soft">
                  {timeOfDay(reminder.remind_at)}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink group-hover:text-grape">
                  {reminder.title}
                </span>
                <Chip tone={meta.tone} size="sm">
                  {meta.label}
                </Chip>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
