"use client";

import type { Note } from "@/lib/notes";
import { MOODS } from "@/lib/validations/note";
import { formatDate, toSnippet } from "@/components/notes/_lib";

type Props = {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onTagClick?: (tag: string) => void;
};

const MOOD_EMOJI = Object.fromEntries(MOODS.map((m) => [m.key, m.emoji]));

export function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onTagClick,
}: Props) {
  const isJournal = note.kind === "journal";
  const dateLabel = isJournal && note.entry_date
    ? formatDate(note.entry_date)
    : `Updated ${formatDate(note.updated_at)}`;

  return (
    <article className="group flex flex-col rounded-3xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isJournal ? "bg-lilac/50 text-grape-deep" : "bg-sky/60 text-ink"
            }`}
          >
            {isJournal ? "📓 Journal" : "🗒️ Note"}
          </span>
          {isJournal && note.mood && (
            <span className="text-lg" title={note.mood}>
              {MOOD_EMOJI[note.mood]}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onTogglePin(note)}
            aria-label={note.pinned ? "Unpin" : "Pin"}
            aria-pressed={note.pinned}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              note.pinned
                ? "text-grape"
                : "text-ink-soft opacity-0 hover:bg-lilac/50 hover:text-grape group-hover:opacity-100 focus-visible:opacity-100"
            }`}
          >
            📌
          </button>
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(note)}
              aria-label="Edit"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-lilac/50 hover:text-grape"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => onDelete(note)}
              aria-label="Delete"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-coral/15 hover:text-coral"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onEdit(note)}
        className="flex-1 text-left"
      >
        <h3 className="line-clamp-2 text-lg font-bold text-ink">{note.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
          {toSnippet(note.body_md) || "No content yet."}
        </p>
      </button>

      {note.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick?.(tag)}
              className="rounded-full bg-lilac/40 px-2 py-0.5 text-xs font-semibold text-grape-deep transition hover:bg-lilac/70"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs font-semibold text-ink-soft/70">{dateLabel}</p>
    </article>
  );
}
