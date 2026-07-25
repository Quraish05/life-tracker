import { z } from "zod";

// A note is either a free-standing note or a journal entry pinned to a day.
// (Plan D1: one `notes` table, `kind: journal | note`.)
export const noteKinds = ["journal", "note"] as const;
export type NoteKind = (typeof noteKinds)[number];

// Preset moods for journal entries. Feeds the future R3 "themes, mood, wins"
// journal digest — capturing it now is free signal for later.
export const MOODS = [
  { key: "great", emoji: "😀", label: "Great" },
  { key: "good", emoji: "🙂", label: "Good" },
  { key: "okay", emoji: "😐", label: "Okay" },
  { key: "low", emoji: "😔", label: "Low" },
  { key: "rough", emoji: "😣", label: "Rough" },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];
export const moodKeys = MOODS.map((m) => m.key) as [MoodKey, ...MoodKey[]];

/** Mood lookup by key — for rendering a stored mood's emoji/label anywhere. */
export const MOOD_BY_KEY = Object.fromEntries(
  MOODS.map((m) => [m.key, m]),
) as Record<MoodKey, (typeof MOODS)[number]>;

/** Max tags per note — kept in one place for the schema and the tag input. */
export const MAX_TAGS = 10;

/**
 * Normalize a raw tag into a hashtag-style slug so the same idea always groups
 * together later: "#Work Stuff" → "work-stuff". Returns "" if nothing usable.
 */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export const noteSchema = z
  .object({
    kind: z.enum(noteKinds),
    title: z
      .string()
      .trim()
      .min(1, "Give it a title")
      .max(120, "Keep the title under 120 characters"),
    body_md: z
      .string()
      .trim()
      .min(1, "Write something first")
      .max(20_000, "That's a lot — keep it under 20,000 characters"),
    // Journal entries are pinned to a date; plain notes aren't.
    entry_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
      .optional(),
    // Freeform tags — double as category ("personal") and hashtags ("#work").
    tags: z.array(z.string().min(1).max(24)).max(MAX_TAGS, `Up to ${MAX_TAGS} tags`),
    // Optional mood, only meaningful for journal entries.
    mood: z.enum(moodKeys).nullable(),
    pinned: z.boolean(),
  })
  .refine((data) => data.kind !== "journal" || Boolean(data.entry_date), {
    message: "Journal entries need a date",
    path: ["entry_date"],
  });

export type NoteInput = z.infer<typeof noteSchema>;
