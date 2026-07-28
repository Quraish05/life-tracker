import type { MoodKey, NoteKind } from "@/lib/validations/note";

/** A journal entry or free-form note. */
export type Note = {
  id: number;
  kind: NoteKind;
  title: string;
  body_md: string;
  /** Present only for journal entries (YYYY-MM-DD). */
  entry_date: string | null;
  /** Hashtag-style slugs — normalized server-side. */
  tags: string[];
  /** Optional mood for journal entries. */
  mood: MoodKey | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

/** A reminder the AI proposes from a note's text — a *suggestion*, not yet created. */
export type FollowUpKind = "task" | "event" | "unclear";
export type Confidence = "high" | "medium" | "low";

export type FollowUp = {
  title: string;
  /** ISO-8601 with offset, or null when the entry implies no time (you pick one). */
  remind_at: string | null;
  kind: FollowUpKind;
  confidence: Confidence;
  reason: string;
};

export type FollowUpSuggestions = {
  note_id: number;
  /** Which model produced these — surfaced for transparency. */
  model: string;
  suggestions: FollowUp[];
};

/** One AI-proposed topic tag for a note, with a short justification. */
export type TagSuggestion = {
  /** Hashtag-style slug, normalized again client-side before it's applied. */
  tag: string;
  reason: string;
};

export type TagSuggestions = {
  /** Which model produced these — surfaced for transparency. */
  model: string;
  suggestions: TagSuggestion[];
};
