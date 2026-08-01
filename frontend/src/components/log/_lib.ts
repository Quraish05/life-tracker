// Shared config + helpers for the "Log an entry" hub.

import type { MealSlot } from "@/lib/validations/meal";
import { SLOTS, parseISODate, toISODate, todayISO } from "@/components/calendar/_lib";

/** The four meal slots with their rough time-of-day label, in log order. */
export const LOG_SLOTS: {
  key: MealSlot;
  label: string;
  emoji: string;
  when: string;
}[] = SLOTS.map((slot) => ({
  ...slot,
  when: { breakfast: "6–11am", lunch: "11am–4pm", dinner: "4–10pm", snack: "Anytime" }[
    slot.key
  ],
}));

/** "lunch" -> "Lunch". */
export const slotLabel = (slot: MealSlot): string =>
  slot.charAt(0).toUpperCase() + slot.slice(1);

/** Move an ISO date by whole days, keeping it local (no timezone drift). */
export function shiftISODate(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "Jul 30" from a YYYY-MM-DD date. */
function shortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** The day-picker label: "Today, Jul 30" for today, else "Wed, Jul 29". */
export function pickerLabel(iso: string): string {
  if (iso === todayISO()) return `Today, ${shortDate(iso)}`;
  const weekday = parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "short",
  });
  return `${weekday}, ${shortDate(iso)}`;
}

/** "Saves to Jul 30" footer note used across the log modals. */
export const savesToLabel = (iso: string): string => `Saves to ${shortDate(iso)}`;
