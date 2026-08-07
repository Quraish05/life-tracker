"use client";

import { useMemo } from "react";
import Link from "next/link";

import { useReminders } from "@/lib/queries/use-reminders";
import { useMeals } from "@/lib/queries/use-meals";
import { useExercises } from "@/lib/queries/use-exercises";
import { useNotes } from "@/lib/queries/use-notes";
import { reminderStatus } from "@/components/reminders/_lib";
import { todayISO } from "@/components/calendar/_lib";
import { Card } from "@/components/ui/atoms/card";
import { IconTile } from "@/components/ui/atoms/icon-tile";

type NextItem = {
  key: string;
  emoji: string;
  title: string;
  subtext: string;
  href: string;
  action: string;
  urgent?: boolean;
};

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * "Up next" — the home rail of real, derivable nudges: the soonest pending
 * reminder, plus whatever hasn't been logged today (journal, workout, meals).
 * Everything here is computed from actual data; nothing is invented.
 */
export function UpNext() {
  const today = todayISO();
  const { data: reminders = [] } = useReminders();
  const { data: meals = [] } = useMeals(today, today);
  const { data: exercises = [] } = useExercises(today, today);
  const { data: notes = [] } = useNotes();

  const items = useMemo<NextItem[]>(() => {
    const list: NextItem[] = [];

    // Soonest reminder that hasn't been delivered yet.
    const pending = reminders
      .filter((r) => reminderStatus(r) !== "delivered")
      .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime());
    const next = pending[0];
    if (next) {
      const overdue = reminderStatus(next) === "overdue";
      list.push({
        key: `reminder-${next.id}`,
        emoji: "🔔",
        title: next.title,
        subtext: `${overdue ? "Overdue · " : ""}${timeLabel(next.remind_at)}`,
        href: "/reminders",
        action: "Open",
        urgent: overdue,
      });
    }

    const journaledToday = notes.some((n) => n.kind === "journal" && n.entry_date === today);
    if (!journaledToday) {
      list.push({
        key: "journal",
        emoji: "📝",
        title: "No journal entry yet",
        subtext: "Capture how today went",
        href: "/journal",
        action: "Write",
      });
    }

    if (exercises.length === 0) {
      list.push({
        key: "workout",
        emoji: "🏋️",
        title: "No workout logged",
        subtext: "Log today's movement",
        href: "/log",
        action: "Log",
      });
    }

    if (meals.length === 0) {
      list.push({
        key: "meals",
        emoji: "🍽️",
        title: "No meals logged today",
        subtext: "Add what you've eaten",
        href: "/log",
        action: "Log",
      });
    }

    return list.slice(0, 3);
  }, [reminders, meals, exercises, notes, today]);

  return (
    <Card tone="soft" padding="md" className="w-full laptop:w-[340px] laptop:shrink-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Up next</p>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-semibold text-foreground">All caught up</p>
          <p className="text-xs text-muted">Logged, journaled, and no reminders pending.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition hover:border-grape/40 ${
                  item.urgent
                    ? "border-coral/40 bg-coral/5"
                    : "border-border/40 bg-surface/40"
                }`}
              >
                <IconTile size="md" tone="white">
                  {item.emoji}
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-muted">{item.subtext}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-grape">{item.action}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
