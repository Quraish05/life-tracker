import { MOODS, type MoodKey } from "@/lib/validations/note";

/**
 * Presentation for the journal redesign. We keep the app's five moods
 * (great/good/okay/low/rough — changing them is a data migration) and give each
 * a colour wash from the palette, per the Journal desk design.
 *
 * Class strings are written out in full (not composed from a token) so Tailwind
 * v4's source scanner keeps them — same rule as `NOTE_FOLDERS`.
 */
export const MOOD_WASH: Record<MoodKey, string> = {
  great: "bg-mint text-ink",
  good: "bg-sky text-ink",
  okay: "bg-muted/25 text-foreground",
  low: "bg-butter text-ink",
  rough: "bg-peach text-ink",
};

/** Mood filter options for the journal list: "All" first, then the five moods. */
export const MOOD_FILTERS: { key: "all" | MoodKey; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "" },
  ...MOODS.map((m) => ({ key: m.key, label: m.label, emoji: m.emoji })),
];
