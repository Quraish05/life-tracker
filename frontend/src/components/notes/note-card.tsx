"use client";

import Link from "next/link";

import type { Note } from "@/types/note";
import { MOOD_BY_KEY } from "@/lib/validations/note";
import { FOLDER_BY_SLUG } from "@/constants/notes";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { HighlightedSnippet } from "@/components/notes/highlighted-snippet";
import { formatDate, toSnippet } from "@/components/notes/_lib";

type Props = {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onTagClick?: (tag: string) => void;
  /** Tick a checklist item off (or back on) from the card. */
  onToggleItem?: (note: Note, index: number) => void;
  /** How many reminders point at this note; shows a 🔔 badge when > 0. */
  reminderCount?: number;
  /**
   * A search snippet (with `<mark>` highlights) to show in place of the plain
   * body preview — set when this card is a full-text search result.
   */
  snippet?: string;
};

export function NoteCard(props: Props) {
  return props.note.kind === "journal" ? (
    <JournalCard {...props} />
  ) : (
    <PlainNoteCard {...props} />
  );
}

/** The redesigned free-form note card: folder accent + bottom action row. */
function PlainNoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleItem,
  reminderCount = 0,
  snippet,
}: Props) {
  const folder = note.folder ? FOLDER_BY_SLUG[note.folder] : undefined;
  const isChecklist = note.kind === "checklist";

  return (
    <Card asChild interactive className="group relative flex flex-col overflow-hidden">
      <article>
        {/* Folder accent strip, flush to the card's top edge. */}
        {folder && (
          <div className={`-mx-5 -mt-5 mb-4 h-1.5 rounded-t-2xl ${folder.strip}`} />
        )}

        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="flex-1 text-left"
          >
            <h3 className="line-clamp-2 text-lg font-bold text-foreground">
              {note.title}
            </h3>
          </button>
          {note.pinned && (
            <span className="shrink-0 text-coral" title="Pinned" aria-hidden>
              📌
            </span>
          )}
        </div>

        {isChecklist ? (
          <Checklist note={note} onToggleItem={onToggleItem} />
        ) : (
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="mt-2 text-left"
          >
            {snippet !== undefined ? (
              <HighlightedSnippet text={snippet} />
            ) : (
              <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                {toSnippet(note.body_md) || "No content yet."}
              </p>
            )}
          </button>
        )}

        {/* Bottom row: folder + edited date, with hover-revealed actions. */}
        <div className="mt-4 flex items-center justify-between gap-2 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            {folder && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${folder.chip}`}
              >
                {folder.label}
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
            <span className="truncate text-xs font-semibold text-muted/70">
              Edited {formatDate(note.updated_at)}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
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
      </article>
    </Card>
  );
}

/** Preview of a checklist's rows, with inline tick-off. Caps at a few rows. */
function Checklist({
  note,
  onToggleItem,
  max = 5,
}: {
  note: Note;
  onToggleItem?: (note: Note, index: number) => void;
  max?: number;
}) {
  const shown = note.items.slice(0, max);
  const extra = note.items.length - shown.length;

  return (
    <div className="mt-3">
      <ul className="space-y-1.5">
        {shown.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              aria-label={item.text}
              onClick={() => onToggleItem?.(note, i)}
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none transition ${
                item.done
                  ? "border-grape bg-grape text-on-accent"
                  : "border-border hover:border-grape"
              }`}
            >
              {item.done ? "✓" : ""}
            </button>
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
      {extra > 0 && (
        <p className="mt-1.5 text-xs font-semibold text-muted/70">
          +{extra} more
        </p>
      )}
    </div>
  );
}

/** The existing journal card — unchanged pending its own redesign pass. */
function JournalCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onTagClick,
  reminderCount = 0,
  snippet,
}: Props) {
  const dateLabel = note.entry_date
    ? formatDate(note.entry_date)
    : `Updated ${formatDate(note.updated_at)}`;

  const preview = (
    <>
      <h3 className="line-clamp-2 text-lg font-bold text-foreground">{note.title}</h3>
      {snippet !== undefined ? (
        <HighlightedSnippet text={snippet} />
      ) : (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
          {toSnippet(note.body_md) || "No content yet."}
        </p>
      )}
    </>
  );

  return (
    <Card asChild interactive className="group flex flex-col">
      <article>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Chip tone="muted">📓 Journal</Chip>
            {note.mood && (
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

        <Link href={`/notes/${note.id}`} className="flex-1 text-left">
          {preview}
        </Link>

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

        <p className="mt-4 text-xs font-semibold text-muted/70">{dateLabel}</p>
      </article>
    </Card>
  );
}
