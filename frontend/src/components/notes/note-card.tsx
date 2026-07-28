"use client";

import Link from "next/link";

import type { Note } from "@/types/note";
import { MOOD_BY_KEY } from "@/lib/validations/note";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { formatDate, toSnippet } from "@/components/notes/_lib";

type Props = {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onTagClick?: (tag: string) => void;
  /** How many reminders point at this note; shows a 🔔 badge when > 0. */
  reminderCount?: number;
};

export function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onTagClick,
  reminderCount = 0,
}: Props) {
  const isJournal = note.kind === "journal";
  const dateLabel = isJournal && note.entry_date
    ? formatDate(note.entry_date)
    : `Updated ${formatDate(note.updated_at)}`;

  const preview = (
    <>
      <h3 className="line-clamp-2 text-lg font-bold text-ink">{note.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
        {toSnippet(note.body_md) || "No content yet."}
      </p>
    </>
  );

  return (
    <Card asChild interactive className="group flex flex-col">
      <article>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Chip tone={isJournal ? "muted" : "sky"}>
              {isJournal ? "📓 Journal" : "🗒️ Note"}
            </Chip>
            {isJournal && note.mood && (
              <span className="text-lg" title={MOOD_BY_KEY[note.mood].label}>
                {MOOD_BY_KEY[note.mood].emoji}
              </span>
            )}
            {reminderCount > 0 && (
              <Chip
                tone="soft"
                size="sm"
                title={`${reminderCount} reminder${reminderCount > 1 ? "s" : ""} attached`}
              >
                🔔 {reminderCount}
              </Chip>
            )}
          </div>
          <div className="flex gap-1">
            <IconButton
              onClick={() => onTogglePin(note)}
              aria-label={note.pinned ? "Unpin" : "Pin"}
              aria-pressed={note.pinned}
              tone={note.pinned ? "active" : "neutral"}
              className={
                note.pinned
                  ? ""
                  : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              }
            >
              📌
            </IconButton>
            <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <IconButton onClick={() => onEdit(note)} aria-label="Edit">
                ✏️
              </IconButton>
              <IconButton
                onClick={() => onDelete(note)}
                aria-label="Delete"
                tone="danger"
              >
                🗑️
              </IconButton>
            </div>
          </div>
        </div>

        {/*
          Journals open a read view (a Link); plain notes jump straight into
          editing (a button). Only the wrapper differs — the preview is shared.
        */}
        {isJournal ? (
          <Link href={`/notes/${note.id}`} className="flex-1 text-left">
            {preview}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="flex-1 text-left"
          >
            {preview}
          </button>
        )}

        {note.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <Chip key={tag} asChild interactive tone="soft" size="sm">
                <button type="button" onClick={() => onTagClick?.(tag)}>
                  #{tag}
                </button>
              </Chip>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs font-semibold text-ink-soft/70">
          {dateLabel}
        </p>
      </article>
    </Card>
  );
}
