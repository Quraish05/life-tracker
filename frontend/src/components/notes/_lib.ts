// Shared helpers for the notes/journal feature.

/** Today's date as YYYY-MM-DD, for defaulting a new journal entry. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Format an ISO date/datetime string as "Tue, Jul 22, 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Strip markdown syntax down to a plain-text teaser for a card body. */
export function toSnippet(md: string, max = 160): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** State-dependent classes for a bordered selectable pill (kind/mood/pin toggles). */
export function optionPillClass(active: boolean): string {
  return active
    ? "border-grape/40 bg-white text-grape shadow-sm"
    : "border-transparent bg-cream/80 text-ink/60 hover:bg-white/70";
}
