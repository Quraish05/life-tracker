import { z } from "zod";

// One `notes` table, three shapes by `kind`: a journal entry pinned to a day, a
// free-standing text note, or a checklist. Journal/note carry `body_md`; a
// checklist carries `items`.
export const noteKinds = ["journal", "note", "checklist"] as const;
export type NoteKind = (typeof noteKinds)[number];

/** Max checklist items per note — mirrors the backend `MAX_ITEMS`. */
export const MAX_ITEMS = 100;

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

/** Max length of a folder slug — mirrors the backend `MAX_FOLDER`. */
export const MAX_FOLDER = 40;

/**
 * Slugify a folder name the same way tags are slugified, but single-valued:
 * "Eating Out" → "eating-out". Returns null for empty/whitespace (= no folder).
 * Mirrors the backend `normalize_folder`.
 */
export function normalizeFolder(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_FOLDER);
  return slug || null;
}

/** One checklist row. */
export const checklistItemSchema = z.object({
  text: z.string().trim().max(200),
  done: z.boolean(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const noteSchema = z
  .object({
    kind: z.enum(noteKinds),
    title: z
      .string()
      .trim()
      .min(1, "Give it a title")
      .max(120, "Keep the title under 120 characters"),
    // Optional here (a checklist may have no body); the per-kind rules below
    // require a body for journal/note.
    body_md: z
      .string()
      .trim()
      .max(20_000, "That's a lot — keep it under 20,000 characters"),
    // Journal entries are pinned to a date; plain notes aren't.
    entry_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
      .optional(),
    // Freeform tags — hashtags for search + AI, many per note.
    tags: z.array(z.string().min(1).max(24)).max(MAX_TAGS, `Up to ${MAX_TAGS} tags`),
    // Single-select folder slug the note lives in, or null for none.
    folder: z.string().max(MAX_FOLDER).nullable(),
    // Checklist rows; empty for journal/note.
    items: z
      .array(checklistItemSchema)
      .max(MAX_ITEMS, `Up to ${MAX_ITEMS} items`),
    // Optional mood, only meaningful for journal entries.
    mood: z.enum(moodKeys).nullable(),
    pinned: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "journal" && !data.entry_date) {
      ctx.addIssue({
        code: "custom",
        path: ["entry_date"],
        message: "Journal entries need a date",
      });
    }
    if (data.kind === "checklist") {
      const filled = data.items.filter((i) => i.text.trim().length > 0);
      if (filled.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: "Add at least one item",
        });
      }
    } else if (data.body_md.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["body_md"],
        message: "Write something first",
      });
    }
  });

export type NoteInput = z.infer<typeof noteSchema>;
