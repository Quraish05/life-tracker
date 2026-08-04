"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Note } from "@/types/note";
import { useDeleteNote, useNotes } from "@/lib/queries/use-notes";
import { Button } from "@/components/ui/atoms/button";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { JournalReader } from "@/components/journal/journal-reader";
import { NoteEditor } from "@/components/notes/note-editor";
import { ReminderEditor } from "@/components/reminders/reminder-editor";
import { FollowUpSuggestions } from "@/components/notes/follow-up-suggestions";

/** Standalone, shareable page for a single journal entry: `/journal/[id]`. */
export default function JournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const entryId = Number(id);
  const router = useRouter();

  const { data: notes = [], isLoading } = useNotes();
  const deleteNote = useDeleteNote();

  const [editing, setEditing] = useState<Note | null>(null);
  const [remindingNote, setRemindingNote] = useState<Note | null>(null);
  const [suggestingNote, setSuggestingNote] = useState<Note | null>(null);

  // All journal entries, newest date first — the same ordering as the list, so
  // prev/next and the nearby jump-list line up with what the reader expects.
  const journalNotes = useMemo(
    () =>
      notes
        .filter((n) => n.kind === "journal")
        .sort((a, b) => (b.entry_date ?? "").localeCompare(a.entry_date ?? "")),
    [notes],
  );
  const note = journalNotes.find((n) => n.id === entryId);

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
          icon="📓"
          title={
            <>
              This entry <AccentText tone="grape">isn&rsquo;t here</AccentText>
            </>
          }
          description="It may have been deleted, or the link is out of date."
          action={
            <Button asChild>
              <Link href="/journal">← Back to journal</Link>
            </Button>
          }
        />
      </div>
    );
  }

  function handleDelete(target: Note) {
    // On a detail page the natural undo is the back button, so this commits the
    // delete straight away and returns to the list (where the entry is gone).
    deleteNote.mutate(target.id);
    router.push("/journal");
  }

  return (
    <>
      <JournalReader
        entries={journalNotes}
        note={note}
        onEdit={(n) => setEditing(n)}
        onDelete={handleDelete}
      />

      {editing && (
        <NoteEditor
          note={editing}
          fixedKind="journal"
          allTags={allTags}
          onAddReminder={(n) => {
            setEditing(null);
            setRemindingNote(n);
          }}
          onSuggestFollowUps={(n) => {
            setEditing(null);
            setSuggestingNote(n);
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
}
