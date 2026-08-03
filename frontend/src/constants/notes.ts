import type { NoteKind } from "@/lib/validations/note";

/** The notes-list filter: any note kind, or "all". */
export type Filter = "all" | NoteKind;

/** Options for the notes-list kind filter. */
export const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "journal", label: "📓 Journal" },
  { value: "note", label: "🗒️ Notes" },
];

/** Kind choices offered in the note editor. */
export const KIND_OPTIONS: { value: NoteKind; label: string; emoji: string }[] = [
  { value: "journal", label: "Journal", emoji: "📓" },
  { value: "note", label: "Note", emoji: "🗒️" },
];

/**
 * A note folder — one bucket a note can live in. `slug` is what's stored; the
 * label + colour are presentation-only and live here (not in the DB), so we can
 * restyle freely. Class strings are written out in full (not composed from the
 * token) so Tailwind v4's source scanner keeps them.
 */
export type NoteFolder = {
  slug: string;
  label: string;
  /** Filled dot beside the label. */
  dot: string;
  /** Soft pill used for the folder badge on a card. */
  chip: string;
  /** Accent strip along the top of a card. */
  strip: string;
  /** Selected-state classes for the folder picker in the editor. */
  active: string;
};

export const NOTE_FOLDERS: NoteFolder[] = [
  {
    slug: "eating-out",
    label: "Eating out",
    dot: "bg-peach",
    chip: "bg-peach/40 text-ink",
    strip: "bg-peach",
    active: "border-peach bg-peach/30 text-ink",
  },
  {
    slug: "shopping",
    label: "Shopping",
    dot: "bg-mint",
    chip: "bg-mint/50 text-ink",
    strip: "bg-mint",
    active: "border-mint bg-mint/40 text-ink",
  },
  {
    slug: "health",
    label: "Health",
    dot: "bg-sky",
    chip: "bg-sky/60 text-ink",
    strip: "bg-sky",
    active: "border-sky bg-sky/50 text-ink",
  },
  {
    slug: "recipes",
    label: "Recipes",
    dot: "bg-butter",
    chip: "bg-butter/30 text-ink",
    strip: "bg-butter",
    active: "border-butter bg-butter/25 text-ink",
  },
];

/** Look up a folder's presentation by slug (unknown/null → undefined). */
export const FOLDER_BY_SLUG: Record<string, NoteFolder> = Object.fromEntries(
  NOTE_FOLDERS.map((f) => [f.slug, f]),
);
