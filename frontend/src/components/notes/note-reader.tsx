"use client";

import Link from "next/link";

import type { Note } from "@/types/note";
import { MOOD_BY_KEY } from "@/lib/validations/note";
import { FOLDER_BY_SLUG } from "@/constants/notes";
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
  const folder = note.folder ? FOLDER_BY_SLUG[note.folder] : undefined;
  const backHref = isJournal ? "/journal" : "/notes";
  const backLabel = isJournal ? "← Back to journal" : "← Back to notes";
  const dateLabel = note.entry_date
    ? formatDate(note.entry_date)
    : `Written ${formatDate(note.created_at)}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Top bar: back + edit, outside the "paper" */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          ✏️ Edit
        </Button>
      </div>

      {/* The paper sheet */}
      <article className="relative overflow-hidden rounded-3xl border border-border/50 bg-surface/80 shadow-xl shadow-grape/5 backdrop-blur-sm">
        {/* Ruled margin line, like a notebook */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-10 w-px bg-coral/30 sm:left-14"
        />

        <div className="relative py-10 pl-16 pr-8 sm:pl-20 sm:pr-12">
          {/* Masthead */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {isJournal ? (
              <Chip tone="muted">📓 Journal</Chip>
            ) : folder ? (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${folder.chip}`}
              >
                {folder.label}
              </span>
            ) : (
              <Chip tone="sky">🗒️ Note</Chip>
            )}
            {mood && (
              <Chip tone="soft" size="sm" title={mood.label}>
                {mood.emoji} {mood.label}
              </Chip>
            )}
            <span className="ml-auto text-sm font-semibold text-muted/70">
              {dateLabel}
            </span>
          </div>

          <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            {note.title || "Untitled entry"}
          </h1>

          <hr className="my-6 border-border/50" />

          {/* Ruled reading surface */}
          {note.kind === "checklist" ? (
            <ul className="space-y-2 text-[1.0625rem] leading-8">
              {note.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                      item.done
                        ? "border-grape bg-grape text-on-accent"
                        : "border-border"
                    }`}
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  <span
                    className={
                      item.done ? "text-muted line-through" : "text-foreground/90"
                    }
                  >
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="[&>*:first-child]:mt-0 text-[1.0625rem] leading-8 text-foreground/90 [background:repeating-linear-gradient(transparent,transparent_31px,rgb(226_213_255_/_0.35)_32px)]">
              <MarkdownPreview>{note.body_md}</MarkdownPreview>
            </div>
          )}

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
