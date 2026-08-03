"use client";

import { useMemo, useState } from "react";

import type { Note } from "@/types/note";
import {
  useDeleteNote,
  useNoteSearch,
  useNotes,
  useTogglePin,
} from "@/lib/queries/use-notes";
import { useReminders } from "@/lib/queries/use-reminders";
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

/**
 * Journal page — daily entries with a date + mood. This reuses the existing
 * note card/editor unchanged; only journal-kind entries are shown here. (The
 * Notes half of the old combined page now lives at `/notes` with its own
 * folder-based redesign.)
 */
export default function JournalPage() {
  const { data: notes = [], isLoading } = useNotes();
  const { data: reminders = [] } = useReminders();
  const deleteNote = useDeleteNote();
  const togglePinMutation = useTogglePin();

  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // null = closed, "new" = create, Note = edit that note.
  const [editing, setEditing] = useState<Note | "new" | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [remindingNote, setRemindingNote] = useState<Note | null>(null);
  const [suggestingNote, setSuggestingNote] = useState<Note | null>(null);

  const reminderCountByNote = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of reminders) {
      if (r.target_type === "note" && r.target_id != null) {
        counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [reminders]);

  // Only journal entries belong on this page.
  const journalNotes = useMemo(
    () => notes.filter((n) => n.kind === "journal"),
    [notes],
  );

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of journalNotes) {
      for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [journalNotes]);

  const visible = useMemo(() => {
    return journalNotes.filter((n) => {
      if (tagFilter && !n.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [journalNotes, tagFilter]);

  const [submitted, setSubmitted] = useState("");
  const isSearching = submitted.trim().length > 0;
  const search = useNoteSearch(submitted);
  // Search spans all notes; keep only journal hits on this page.
  const hits = (search.data ?? []).filter((h) => h.kind === "journal");

  async function confirmDelete() {
    if (!deleting) return;
    await deleteNote.mutateAsync(deleting.id);
    setDeleting(null);
  }

  function togglePin(note: Note) {
    togglePinMutation.mutate({ id: note.id, pinned: !note.pinned });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Reflect"
        title={
          <>
            Your <AccentText>thoughts</AccentText>, captured
          </>
        }
        subtitle="Daily journal entries — how the day went, and how you felt."
        action={<Button onClick={() => setEditing("new")}>+ New entry</Button>}
      />

      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(query.trim());
          }}
          className="relative w-full max-w-xs"
          role="search"
        >
          <input
            type="search"
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              if (value.trim() === "") setSubmitted("");
            }}
            placeholder="Search journal…"
            aria-label="Search journal"
            className="w-full rounded-full border border-transparent bg-surface/70 py-2 pl-4 pr-11 text-sm text-foreground placeholder:text-muted/60 transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring"
          />
          <button
            type="submit"
            aria-label="Search"
            disabled={query.trim() === ""}
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-grape text-white transition hover:bg-grape/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40 disabled:hover:bg-grape"
          >
            →
          </button>
        </form>
      </div>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted/70">
            Tags
          </span>
          {allTags.map((tag) => {
            const active = tagFilter === tag;
            return (
              <Chip key={tag} asChild interactive tone={active ? "solid" : "soft"}>
                <button type="button" onClick={() => setTagFilter(active ? null : tag)}>
                  #{tag}
                </button>
              </Chip>
            );
          })}
          {tagFilter && (
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className="rounded-full px-2.5 py-1 text-xs font-semibold text-muted transition hover:text-coral"
            >
              Clear ✕
            </button>
          )}
        </div>
      )}

      {isSearching ? (
        search.isLoading ? (
          <p className="text-sm text-muted">Searching…</p>
        ) : search.isError ? (
          <p className="text-sm text-coral">
            {search.error instanceof Error ? search.error.message : "Search failed."}
          </p>
        ) : hits.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={
              <>
                Nothing <AccentText tone="grape">matches</AccentText>
              </>
            }
            description={`No journal entries match “${submitted.trim()}”.`}
          />
        ) : (
          <>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted/70">
              {hits.length} result{hits.length > 1 ? "s" : ""} · ranked by relevance
              {search.isFetching && " · updating…"}
            </p>
            <CardGrid>
              {hits.map((hit) => (
                <NoteCard
                  key={hit.id}
                  note={hit}
                  snippet={hit.snippet}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  onTogglePin={togglePin}
                  onTagClick={setTagFilter}
                  reminderCount={reminderCountByNote.get(hit.id) ?? 0}
                />
              ))}
            </CardGrid>
          </>
        )
      ) : isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        journalNotes.length > 0 ? (
          <EmptyState
            icon="🔍"
            title={
              <>
                Nothing <AccentText tone="grape">matches</AccentText>
              </>
            }
            description="Try a different tag or search term."
          />
        ) : (
          <EmptyState
            icon="📓"
            title={
              <>
                A blank <AccentText tone="grape">page</AccentText> awaits
              </>
            }
            description="Write your first journal entry to get started."
            action={<Button onClick={() => setEditing("new")}>+ New entry</Button>}
          />
        )
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
          fixedKind="journal"
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
