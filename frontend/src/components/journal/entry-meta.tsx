import type { Note } from "@/types/note";
import { readLabel, timeOf, wordCount } from "@/components/journal/_lib";
import { MoodChip } from "@/components/journal/mood-chip";

type Props = {
  note: Note;
  /**
   * `compact` — drawer preview: mood · time · words (words pushed right).
   * `full` — the reader/page: mood · "Written {time}" · words · read time.
   */
  variant?: "compact" | "full";
};

/** Shared meta row for a journal entry — mood chip plus written time and length.
 *  Used by both the preview drawer and the full-entry page so they never drift. */
export function EntryMeta({ note, variant = "full" }: Props) {
  const words = wordCount(note.body_md);

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <MoodChip mood={note.mood} size="md" />
        <span className="text-[11px] text-muted">{timeOf(note.created_at)}</span>
        <span className="ml-auto text-[11px] text-muted">{words} words</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <MoodChip mood={note.mood} size="lg" />
      <span className="text-[11.5px] text-muted">Written {timeOf(note.created_at)}</span>
      <span className="text-[11.5px] text-muted">· {words} words</span>
      <span className="text-[11.5px] text-muted">· {readLabel(words)}</span>
    </div>
  );
}
