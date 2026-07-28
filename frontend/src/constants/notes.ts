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
