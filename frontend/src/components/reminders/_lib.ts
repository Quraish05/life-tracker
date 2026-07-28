// Shared helpers for the reminders feature.

import type { Reminder } from "@/types/reminder";

/**
 * Convert an ISO string (or now) into a value for an `<input type="datetime-local">`,
 * which expects local wall-clock time as "YYYY-MM-DDTHH:mm" (no timezone).
 */
export function toDatetimeLocal(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  // Shift by the local offset so slicing the UTC ISO yields *local* time.
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/**
 * Convert a `datetime-local` value back to an ISO string with offset. The input
 * has no timezone, so `new Date()` reads it as local time — exactly what we want.
 */
export function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

/** A sensible default for a new reminder: the next hour, on the hour. */
export function defaultRemindAtIso(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d.toISOString();
}

/** Human-friendly "Tue, Jul 22, 6:00 PM". */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ReminderStatus = "delivered" | "overdue" | "upcoming";

/** Where a reminder sits in its lifecycle, for grouping and badges. */
export function reminderStatus(reminder: Reminder): ReminderStatus {
  if (reminder.sent_at) return "delivered";
  return new Date(reminder.remind_at).getTime() <= Date.now() ? "overdue" : "upcoming";
}

/** Label + Chip tone for each status — shared by the table and any badges. */
export const STATUS_META: Record<
  ReminderStatus,
  { label: string; tone: "sky" | "danger" | "success" }
> = {
  upcoming: { label: "⏰ Upcoming", tone: "sky" },
  overdue: { label: "⚠️ Overdue", tone: "danger" },
  delivered: { label: "✓ Delivered", tone: "success" },
};

export type ReminderSortKey = "status" | "title" | "remind_at";
export type SortDir = "asc" | "desc";

// Sort priority when ordering by status: needs-attention first.
const STATUS_ORDER: Record<ReminderStatus, number> = {
  overdue: 0,
  upcoming: 1,
  delivered: 2,
};

/** Comparator for the reminders table; `dir` flips ascending/descending. */
export function compareReminders(
  a: Reminder,
  b: Reminder,
  key: ReminderSortKey,
  dir: SortDir,
): number {
  let cmp: number;
  if (key === "title") {
    cmp = a.title.localeCompare(b.title);
  } else if (key === "remind_at") {
    cmp = new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime();
  } else {
    cmp = STATUS_ORDER[reminderStatus(a)] - STATUS_ORDER[reminderStatus(b)];
  }
  return dir === "asc" ? cmp : -cmp;
}
