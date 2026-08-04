import type { Note } from "@/types/note";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { toSnippet } from "@/components/notes/_lib";
import { dayNum, dowShort } from "@/components/journal/_lib";
import { MoodChip } from "@/components/journal/mood-chip";
import { EntryTags } from "@/components/journal/entry-tags";

type Props = {
  note: Note;
  active: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** One entry in the month-grouped list: day chip, title + mood, snippet, tags. */
export function EntryRow({
  note,
  active,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border px-4 py-3 transition ${
        active
          ? "border-grape bg-grape/10"
          : "border-border bg-surface hover:border-grape/40"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        {note.entry_date && (
          <span className="flex w-11 flex-none flex-col items-center">
            <span className="text-[17px] font-bold leading-none text-foreground">
              {dayNum(note.entry_date)}
            </span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
              {dowShort(note.entry_date)}
            </span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">
              {note.title || "Untitled entry"}
            </span>
            <MoodChip mood={note.mood} size="sm" />
          </span>
          <span className="mt-1 block truncate text-xs leading-relaxed text-muted">
            {toSnippet(note.body_md) || "No content yet."}
          </span>
          <EntryTags tags={note.tags} size="sm" className="mt-2" />
        </span>
      </button>
      <div className="flex flex-none gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <IconButton aria-label="Open full entry" onClick={onOpen}>
          ↗
        </IconButton>
        <IconButton aria-label="Edit entry" onClick={onEdit}>
          ✎
        </IconButton>
        <IconButton aria-label="Delete entry" tone="danger" onClick={onDelete}>
          🗑
        </IconButton>
      </div>
    </div>
  );
}
