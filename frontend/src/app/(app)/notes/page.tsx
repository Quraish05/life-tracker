"use client";

import { useMemo, useState } from "react";

import { type Note } from "@/lib/notes";
import { useDeleteNote, useNotes, useTogglePin } from "@/lib/use-notes";
import type { NoteKind } from "@/lib/validations/note";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/notes/note-card";
import { NoteEditor } from "@/components/notes/note-editor";
import { DeleteDialog } from "@/components/notes/delete-dialog";

type Filter = "all" | NoteKind;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "journal", label: "📓 Journal" },
  { value: "note", label: "🗒️ Notes" },
];

export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotes();
  const deleteNote = useDeleteNote();
  const togglePinMutation = useTogglePin();

  const [filter, setFilter] = useState<Filter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // null = closed, "new" = create, Note = edit that note.
  const [editing, setEditing] = useState<Note | "new" | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

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
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-grape">Journal &amp; Notes</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-ink">
            Your <span className="font-display italic text-coral">thoughts</span>,
            captured
          </h1>
          <p className="mt-2 text-base text-ink-soft">
            Daily journal entries and free-form notes — all in one place.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>+ New entry</Button>
      </header>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-white/60 p-1 text-sm font-semibold shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-4 py-1.5 transition ${
                filter === f.value
                  ? "bg-grape text-white shadow-sm"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
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
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(active ? null : tag)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-grape text-white shadow-sm"
                    : "bg-lilac/40 text-grape-deep hover:bg-lilac/70"
                }`}
              >
                #{tag}
              </button>
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
        <EmptyState
          hasNotes={notes.length > 0}
          onCreate={() => setEditing("new")}
        />
      ) : (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={setEditing}
              onDelete={setDeleting}
              onTogglePin={togglePin}
              onTagClick={setTagFilter}
            />
          ))}
        </section>
      )}

      {editing !== null && (
        <NoteEditor
          note={editing === "new" ? null : editing}
          allTags={allTags}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
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

function EmptyState({
  hasNotes,
  onCreate,
}: {
  hasNotes: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="flex flex-col items-center rounded-3xl border-2 border-dashed border-grape/25 bg-white/60 p-12 text-center backdrop-blur-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-butter text-3xl shadow-sm">
        {hasNotes ? "🔍" : "📓"}
      </div>
      <h2 className="mt-5 text-xl font-bold text-ink">
        {hasNotes ? (
          <>
            Nothing <span className="font-display italic text-grape">matches</span>
          </>
        ) : (
          <>
            A blank <span className="font-display italic text-grape">page</span>{" "}
            awaits
          </>
        )}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        {hasNotes
          ? "Try a different filter or search term."
          : "Write your first journal entry or jot down a note to get started."}
      </p>
      {!hasNotes && (
        <div className="mt-5">
          <Button onClick={onCreate}>+ New entry</Button>
        </div>
      )}
    </section>
  );
}
