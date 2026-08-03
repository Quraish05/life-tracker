"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";

import type { Note } from "@/types/note";
import { useNotes } from "@/lib/queries/use-notes";
import { Button } from "@/components/ui/atoms/button";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { NoteReader } from "@/components/notes/note-reader";
import { NoteEditor } from "@/components/notes/note-editor";
import { FollowUpSuggestions } from "@/components/notes/follow-up-suggestions";
import { ReminderEditor } from "@/components/reminders/reminder-editor";

export default function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const noteId = Number(id);

  const { data: notes = [], isLoading } = useNotes();
  const note = notes.find((n) => n.id === noteId);

  // Read view by default; only flips true when Edit is clicked.
  const [isEditing, setIsEditing] = useState(false);
  // Secondary flows launched from within the editor.
  const [remindingNote, setRemindingNote] = useState<Note | null>(null);
  const [suggestingNote, setSuggestingNote] = useState<Note | null>(null);

  // Tags across all notes, offered as suggestions in the editor. Memoized so it
  // doesn't rebuild on every render (e.g. when toggling the edit/modal state).
  const allTags = useMemo(
    () => [...new Set(notes.flatMap((n) => n.tags))],
    [notes],
  );

  if (isLoading && !note) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
        <EmptyState
          icon="🔍"
          title={
            <>
              This entry <AccentText tone="grape">isn&rsquo;t here</AccentText>
            </>
          }
          description="It may have been deleted, or the link is out of date."
          action={
            <Button asChild>
              <Link href="/notes">← Back to notes</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <NoteReader note={note} onEdit={() => setIsEditing(true)} />

      {isEditing && (
        <NoteEditor
          note={note}
          fixedKind={note.kind}
          allTags={allTags}
          onAddReminder={(n) => {
            setIsEditing(false);
            setRemindingNote(n);
          }}
          onSuggestFollowUps={(n) => {
            setIsEditing(false);
            setSuggestingNote(n);
          }}
          onClose={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
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
}
