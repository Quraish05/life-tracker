"use client";

import Link from "next/link";

import type { Note } from "@/types/note";
import { MOOD_BY_KEY } from "@/lib/validations/note";
import { Button } from "@/components/ui/atoms/button";
import { Chip } from "@/components/ui/atoms/chip";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { formatDate } from "@/components/notes/_lib";

type Props = {
  note: Note;
  /** Switch the page into edit mode. */
  onEdit: () => void;
};

/**
 * A calm, notebook-style read view for a journal entry: a warm paper sheet with
 * a ruled left margin, the entry rendered as prose, and an explicit Edit action.
 * Editing lives elsewhere — this surface is for reading.
 */
export function NoteReader({ note, onEdit }: Props) {
  const isJournal = note.kind === "journal";
  const mood = note.mood ? MOOD_BY_KEY[note.mood] : null;
  const dateLabel = note.entry_date
    ? formatDate(note.entry_date)
    : `Written ${formatDate(note.created_at)}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Top bar: back + edit, outside the "paper" */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/notes">← Back to notes</Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          ✏️ Edit
        </Button>
      </div>

      {/* The paper sheet */}
      <article className="relative overflow-hidden rounded-3xl border border-lilac/50 bg-white/80 shadow-xl shadow-grape/5 backdrop-blur-sm">
        {/* Ruled margin line, like a notebook */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-10 w-px bg-coral/30 sm:left-14"
        />

        <div className="relative py-10 pl-16 pr-8 sm:pl-20 sm:pr-12">
          {/* Masthead */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Chip tone={isJournal ? "muted" : "sky"}>
              {isJournal ? "📓 Journal" : "🗒️ Note"}
            </Chip>
            {mood && (
              <Chip tone="soft" size="sm" title={mood.label}>
                {mood.emoji} {mood.label}
              </Chip>
            )}
            <span className="ml-auto text-sm font-semibold text-ink-soft/70">
              {dateLabel}
            </span>
          </div>

          <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
            {note.title || "Untitled entry"}
          </h1>

          <hr className="my-6 border-lilac/50" />

          {/* Ruled reading surface */}
          <div className="[&>*:first-child]:mt-0 text-[1.0625rem] leading-8 text-ink/90 [background:repeating-linear-gradient(transparent,transparent_31px,rgb(226_213_255_/_0.35)_32px)]">
            <MarkdownPreview>{note.body_md}</MarkdownPreview>
          </div>

          {note.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <Chip key={tag} tone="soft" size="sm">
                  #{tag}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
