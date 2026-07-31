// Shared display helpers for the food library.

/** "lunch" -> "Lunch". */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/** "29 Jul" from a YYYY-MM-DD date, parsed as local (no timezone drift). */
export function shortDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** "12:45" from an ISO datetime. */
export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
