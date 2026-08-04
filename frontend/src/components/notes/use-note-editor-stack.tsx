import { useState, type ReactNode } from "react";

import type { Note } from "@/types/note";
import type { NoteKind } from "@/lib/validations/note";
import { NoteEditor } from "@/components/notes/note-editor";
import { ReminderEditor } from "@/components/reminders/reminder-editor";
import { FollowUpSuggestions } from "@/components/notes/follow-up-suggestions";

interface Options {
  /** Locks the kind for newly-created entries: "note" or "journal". */
  fixedKind: NoteKind;
  /** Preselect this folder when creating (Notes page passes the active filter). */
  presetFolder?: string | null;
  /** Existing tags across notes, offered as suggestions in the editor. */
  allTags?: string[];
}

/**
 * The create/edit → reminder → follow-up modal triad shared by the Notes and
 * Journal pages. Owns the three pieces of modal state so the editor can hand
 * off to the reminder or follow-up flow after it closes. Returns openers plus
 * a `modals` node to render once at the end of the page.
 */
export function useNoteEditorStack({
  fixedKind,
  presetFolder = null,
  allTags,
}: Options) {
  // null = closed, "new" = create, Note = edit that note.
  const [editing, setEditing] = useState<Note | "new" | null>(null);
  const [remindingNote, setRemindingNote] = useState<Note | null>(null);
  const [suggestingNote, setSuggestingNote] = useState<Note | null>(null);

  const modals: ReactNode = (
    <>
      {editing !== null && (
        <NoteEditor
          note={editing === "new" ? null : editing}
          fixedKind={fixedKind}
          presetFolder={presetFolder}
          allTags={allTags}
          onAddReminder={(note) => {
            setEditing(null);
            setRemindingNote(note);
          }}
          onSuggestFollowUps={(note) => {
            setEditing(null);
            setSuggestingNote(note);
          }}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {remindingNote && (
        <ReminderEditor
          reminder={null}
          presetTarget={{ targetType: "note", targetId: remindingNote.id }}
          onClose={() => setRemindingNote(null)}
          onSaved={() => setRemindingNote(null)}
        />
      )}

      {suggestingNote && (
        <FollowUpSuggestions
          note={suggestingNote}
          onClose={() => setSuggestingNote(null)}
          onDone={() => setSuggestingNote(null)}
        />
      )}
    </>
  );

  return {
    /** Open the editor for a brand-new entry. */
    openNew: () => setEditing("new"),
    /** Open the editor for an existing note. */
    openEdit: (note: Note) => setEditing(note),
    /** The rendered modal stack — drop once at the end of the page. */
    modals,
  };
}
