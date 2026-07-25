"use client";

import { useMemo, useState } from "react";

import { type Note } from "@/lib/notes";
import { useDeleteNote, useNotes, useTogglePin } from "@/lib/use-notes";
import { useReminders } from "@/lib/use-reminders";
import type { NoteKind } from "@/lib/validations/note";
import { Button } from "@/components/ui/atoms/button";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Chip } from "@/components/ui/atoms/chip";
import { CardGrid } from "@/components/ui/atoms/card-grid";
import { PageHeader } from "@/components/ui/molecules/page-header";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEditor } from "@/components/notes/note-editor";
import { DeleteDialog } from "@/components/notes/delete-dialog";
import { FollowUpSuggestions } from "@/components/notes/follow-up-suggestions";
import { ReminderEditor } from "@/components/reminders/reminder-editor";

type Filter = "all" | NoteKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "journal", label: "📓 Journal" },
  { value: "note", label: "🗒️ Notes" },
];

export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotes();
  const { data: reminders = [] } = useReminders();
  const deleteNote = useDeleteNote();
  const togglePinMutation = useTogglePin();

  const [filter, setFilter] = useState<Filter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // null = closed, "new" = create, Note = edit that note.
  const [editing, setEditing] = useState<Note | "new" | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  // When set, create a reminder pre-attached to this note.
  const [remindingNote, setRemindingNote] = useState<Note | null>(null);
  // When set, show AI follow-up suggestions for this note.
  const [suggestingNote, setSuggestingNote] = useState<Note | null>(null);

  // How many reminders point at each note, for the card badge.
  const reminderCountByNote = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of reminders) {
      if (r.target_type === "note" && r.target_id != null) {
        counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [reminders]);

  // Every tag in use, most-common first, for the filter bar and suggestions.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes) {
      for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [notes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (filter !== "all" && n.kind !== filter) return false;
      if (tagFilter && !n.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.body_md.toLowerCase().includes(q) ||
        n.tags.some((t) => t.includes(q))
      );
    });
  }, [notes, filter, tagFilter, query]);

  async function confirmDelete() {
    if (!deleting) return;
    await deleteNote.mutateAsync(deleting.id);
    setDeleting(null);
  }

  function togglePin(note: Note) {
    togglePinMutation.mutate({ id: note.id, pinned: !note.pinned });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Journal & Notes"
        title={
          <>
            Your <AccentText>thoughts</AccentText>, captured
          </>
        }
        subtitle="Daily journal entries and free-form notes — all in one place."
        action={<Button onClick={() => setEditing("new")}>+ New entry</Button>}
      />

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-white/60 p-1 shadow-sm">
          {FILTERS.map((f) => (
            <Chip
              key={f.value}
              asChild
              interactive
              size="lg"
              tone={filter === f.value ? "solid" : "ghost"}
            >
              <button type="button" onClick={() => setFilter(f.value)}>
                {f.label}
              </button>
            </Chip>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="w-full max-w-xs rounded-full border border-transparent bg-white/70 px-4 py-2 text-sm text-ink placeholder:text-ink-soft/60 transition focus:border-grape focus:bg-white focus:outline-none focus:ring-4 focus:ring-lilac"
        />
      </div>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-soft/70">
            Tags
          </span>
          {allTags.map((tag) => {
            const active = tagFilter === tag;
            return (
              <Chip
                key={tag}
                asChild
                interactive
                tone={active ? "solid" : "soft"}
              >
                <button
                  type="button"
                  onClick={() => setTagFilter(active ? null : tag)}
                >
                  #{tag}
                </button>
              </Chip>
            );
          })}
          {tagFilter && (
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className="rounded-full px-2.5 py-1 text-xs font-semibold text-ink-soft transition hover:text-coral"
            >
              Clear ✕
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : visible.length === 0 ? (
        <NotesEmptyState
          hasNotes={notes.length > 0}
          onCreate={() => setEditing("new")}
        />
      ) : (
        <CardGrid>
          {visible.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={setEditing}
              onDelete={setDeleting}
              onTogglePin={togglePin}
              onTagClick={setTagFilter}
              reminderCount={reminderCountByNote.get(note.id) ?? 0}
            />
          ))}
        </CardGrid>
      )}

      {editing !== null && (
        <NoteEditor
          note={editing === "new" ? null : editing}
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

      {deleting && (
        <DeleteDialog
          title={deleting.title}
          isDeleting={deleteNote.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function NotesEmptyState({
  hasNotes,
  onCreate,
}: {
  hasNotes: boolean;
  onCreate: () => void;
}) {
  if (hasNotes) {
    return (
      <EmptyState
        icon="🔍"
        title={
          <>
            Nothing <AccentText tone="grape">matches</AccentText>
          </>
        }
        description="Try a different filter or search term."
      />
    );
  }

  return (
    <EmptyState
      icon="📓"
      title={
        <>
          A blank <AccentText tone="grape">page</AccentText> awaits
        </>
      }
      description="Write your first journal entry or jot down a note to get started."
      action={<Button onClick={onCreate}>+ New entry</Button>}
    />
  );
}
