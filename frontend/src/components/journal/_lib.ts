// Helpers for the Journal desk redesign. Native Date only, reusing the calendar
// date utilities so days never drift across the UTC boundary.

import {
  formatMonthTitle,
  parseISODate,
  toISODate,
} from "@/components/calendar/_lib";
import type { Note } from "@/types/note";

/** Whitespace word count of an entry body (markdown syntax counts as words —
 *  close enough for a "208 words" badge). */
export function wordCount(md: string): number {
  return md.trim().split(/\s+/).filter(Boolean).length;
}

/** "1 min read" from a word count, assuming ~220 wpm, floor of 1. */
export function readLabel(words: number): string {
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

/** Local "HH:MM" from an ISO datetime — the time an entry was written. */
export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Day-of-month number from a YYYY-MM-DD date. */
export function dayNum(iso: string): number {
  return parseISODate(iso).getDate();
}

/** Short weekday ("Wed") from a YYYY-MM-DD date. */
export function dowShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: "short" });
}

/** "July 2026" grouping key for an entry's date. */
export function monthTitle(iso: string): string {
  const d = parseISODate(iso);
  return formatMonthTitle(d.getFullYear(), d.getMonth());
}

/** "29 Jul" compact date, for the "entries near this one" list. */
export function shortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * Length of the current writing streak: consecutive calendar days ending at the
 * most recent entry. One entry per day is enough; multiple on a day still count
 * once. Returns 0 for no entries.
 */
export function computeStreak(entries: Note[]): number {
  const days = new Set(
    entries.map((e) => e.entry_date).filter((d): d is string => Boolean(d)),
  );
  if (days.size === 0) return 0;
  const latest = [...days].sort().at(-1)!;
  const cursor = parseISODate(latest);
  let streak = 0;
  while (days.has(toISODate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Group journal entries into month sections, newest month first, entries
 *  within a month kept in the order given (already newest-first from the API). */
export function groupByMonth(entries: Note[]): { title: string; items: Note[] }[] {
  const groups: { title: string; items: Note[] }[] = [];
  for (const e of entries) {
    const title = e.entry_date ? monthTitle(e.entry_date) : "Undated";
    const last = groups.at(-1);
    if (last && last.title === title) last.items.push(e);
    else groups.push({ title, items: [e] });
  }
  return groups;
}
