// Shared helpers for the calendar feature. Native Date only (no date lib in the
// repo). All ISO strings are YYYY-MM-DD built from *local* date parts, so a day
// never shifts across the UTC boundary the way toISOString() would.

export type MealSlotKey = "breakfast" | "lunch" | "dinner" | "snack";

export const SLOTS: { key: MealSlotKey; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🍳" },
  { key: "lunch", label: "Lunch", emoji: "🥗" },
  { key: "dinner", label: "Dinner", emoji: "🍛" },
  { key: "snack", label: "Snack", emoji: "🍎" },
];

/** Meal slots that always show on a day (the "3 mandatory meals"). */
export const MAIN_SLOTS = SLOTS.filter((s) => s.key !== "snack");
export const SNACK_SLOT = SLOTS.find((s) => s.key === "snack")!;
export const MAX_SNACKS = 2;

/** Week starts Monday, to match the Mon–Sun column order. */
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A Date → "YYYY-MM-DD" using local parts. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" → a local Date at midnight. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Today as "YYYY-MM-DD" (local). */
export function todayISO(): string {
  return toISODate(new Date());
}

/** A day cell in the month grid. */
export type DayCell = {
  date: Date;
  iso: string;
  /** False for leading/trailing days that belong to the adjacent month. */
  inMonth: boolean;
};

/**
 * The month laid out as weeks of 7 day-cells (Monday-first), including the
 * adjacent-month days that pad the first and last rows. Trims to the minimum
 * number of weeks needed (5 or 6).
 */
export function monthMatrix(year: number, month: number): DayCell[][] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((leading + daysInMonth) / 7);

  const cells: DayCell[][] = [];
  const cursor = new Date(year, month, 1 - leading);
  for (let w = 0; w < weeks; w++) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      row.push({ date, iso: toISODate(date), inMonth: date.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    cells.push(row);
  }
  return cells;
}

/** Inclusive [start, end] ISO range covering just the given month's own days. */
export function monthRange(year: number, month: number): { start: string; end: string } {
  return {
    start: toISODate(new Date(year, month, 1)),
    end: toISODate(new Date(year, month + 1, 0)),
  };
}

/** Inclusive Monday–Sunday ISO range for the week containing `iso` (default today). */
export function weekRange(iso?: string): { start: string; end: string } {
  const base = iso ? parseISODate(iso) : new Date();
  const offset = (base.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toISODate(monday), end: toISODate(sunday) };
}

/** Move `delta` months from (year, month), normalizing the rollover. */
export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const base = new Date(year, month + delta, 1);
  return { year: base.getFullYear(), month: base.getMonth() };
}

/** "July 2026" */
export function formatMonthTitle(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** "Sunday, July 26, 2026" from a YYYY-MM-DD string. */
export function formatDayLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "Jul 26" from a YYYY-MM-DD string — a compact day label for chips/badges. */
export function formatDayShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
