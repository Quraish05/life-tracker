"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Note } from "@/types/note";
import { Button } from "@/components/ui/atoms/button";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { EntryMeta } from "@/components/journal/entry-meta";
import { EntryTags } from "@/components/journal/entry-tags";
import { EntriesNear } from "@/components/journal/entries-near";
import { ThatDay } from "@/components/journal/that-day";
import { formatDayLong, formatMonthTitle, parseISODate } from "@/components/calendar/_lib";

type Props = {
  /** All journal entries in display order (newest first). */
  entries: Note[];
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
};

/**
 * Immersive full-entry reader, rendered as its own page at `/journal/[id]`:
 * prose, "that day", and jump-to-nearby entries. Navigation between siblings
 * changes the URL (prev/next + the nearby list are real links), so every entry
 * is a shareable, back-button-friendly page.
 *
 * Responsive per the small-screen design: a right rail on laptop+, and a single
 * stacked column on tablet/phone where the nearby list drops away and prose,
 * "that day", then the actions read top-to-bottom.
 */
export function JournalReader({ entries, note, onEdit, onDelete }: Props) {
  const router = useRouter();

  const i = entries.findIndex((e) => e.id === note.id);
  const prev = i > 0 ? entries[i - 1] : null;
  const next = i >= 0 && i < entries.length - 1 ? entries[i + 1] : null;
  const monthLabel = note.entry_date
    ? formatMonthTitle(
        parseISODate(note.entry_date).getFullYear(),
        parseISODate(note.entry_date).getMonth(),
      )
    : "";

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar — sticky within the scrolling main region */}
      <div className="sticky top-0 z-30 flex flex-none items-center gap-2.5 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur tablet:px-6">
        <Button asChild variant="secondary" size="sm">
          <Link href="/journal">← Journal</Link>
        </Button>
        <span className="text-[11px] text-muted">
          Entry {i + 1} of {entries.length}
          {monthLabel && ` · ${monthLabel}`}
        </span>
        {/* Prev/next + edit/delete collapse on phones; the footer covers them */}
        <div className="ml-auto hidden items-center gap-2 tablet:flex">
          <IconButton
            aria-label="Previous entry"
            disabled={!prev}
            onClick={() => prev && router.push(`/journal/${prev.id}`)}
          >
            ↑
          </IconButton>
          <IconButton
            aria-label="Next entry"
            disabled={!next}
            onClick={() => next && router.push(`/journal/${next.id}`)}
          >
            ↓
          </IconButton>
          <Button variant="secondary" size="sm" onClick={() => onEdit(note)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(note)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 tablet:px-8 tablet:py-11 laptop:flex-row laptop:gap-10">
        <article className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-grape">
            {note.entry_date ? formatDayLong(note.entry_date) : "Journal entry"}
          </p>
          <h1 className="mt-3 font-display text-3xl font-normal leading-tight tracking-tight text-foreground tablet:text-4xl">
            {note.title || "Untitled entry"}
          </h1>
          <div className="mt-4 border-b border-border pb-4">
            <EntryMeta note={note} variant="full" />
          </div>

          <div className="mt-6 text-base leading-8 text-foreground [&>*:first-child]:mt-0">
            <MarkdownPreview>{note.body_md}</MarkdownPreview>
          </div>

          <EntryTags tags={note.tags} size="md" className="mt-7" />

          {next && (
            <div className="mt-8 flex items-center gap-3 border-t border-border pt-5">
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
                Next: {next.title || "Untitled entry"}
              </span>
              {/* Edit lives here on phones (hidden from the top bar there) */}
              <Button
                variant="secondary"
                size="sm"
                className="tablet:hidden"
                onClick={() => onEdit(note)}
              >
                Edit
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/journal/${next.id}`}>Read the next one ↓</Link>
              </Button>
            </div>
          )}
          {!next && (
            <div className="mt-8 flex items-center gap-3 border-t border-border pt-5 tablet:hidden">
              <span className="flex-1 text-[11.5px] text-muted">
                That&rsquo;s the earliest entry you&rsquo;ve written.
              </span>
              <Button variant="secondary" size="sm" onClick={() => onEdit(note)}>
                Edit
              </Button>
            </div>
          )}
        </article>

        <aside className="w-full flex-none laptop:w-72">
          {note.entry_date && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <ThatDay date={note.entry_date} variant="stacked" />
            </div>
          )}
          {/* The nearby jump-list is a laptop-and-up affordance; on small screens
              the back button and next link carry navigation. */}
          <div className="mt-2.5 hidden laptop:block">
            <EntriesNear entries={entries} activeId={note.id} />
          </div>
        </aside>
      </div>
    </div>
  );
}
