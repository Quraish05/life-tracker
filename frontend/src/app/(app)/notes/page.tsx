"use client";

import { useMemo, useState } from "react";

import type { Note } from "@/types/note";
import {
  useDeleteNote,
  useNoteSearch,
  useNotes,
  useTogglePin,
  useUpdateNote,
} from "@/lib/queries/use-notes";
import { useReminders } from "@/lib/queries/use-reminders";
import { NOTE_FOLDERS } from "@/constants/notes";
import { Button } from "@/components/ui/atoms/button";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Chip } from "@/components/ui/atoms/chip";
import { Card } from "@/components/ui/atoms/card";
import { CardGrid } from "@/components/ui/atoms/card-grid";
import { PageHeader } from "@/components/ui/molecules/page-header";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { NoteCard } from "@/components/notes/note-card";
import { DeleteDialog } from "@/components/notes/delete-dialog";
import { useNoteEditorStack } from "@/components/notes/use-note-editor-stack";

export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotes();
  const { data: reminders = [] } = useReminders();
  const deleteNote = useDeleteNote();
  const togglePinMutation = useTogglePin();
  const updateNote = useUpdateNote();

  // null = show all folders; otherwise a folder slug.
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [deleting, setDeleting] = useState<Note | null>(null);

  const reminderCountByNote = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of reminders) {
      if (r.target_type === "note" && r.target_id != null) {
        counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [reminders]);

  // Notes + checklists live here; journal entries have their own page.
  const plainNotes = useMemo(
    () => notes.filter((n) => n.kind !== "journal"),
    [notes],
  );

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of plainNotes) {
      for (const t of n.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [plainNotes]);

  // Editor → reminder → follow-up modal stack, preselecting the active folder.
  const editors = useNoteEditorStack({
    fixedKind: "note",
    presetFolder: folderFilter,
    allTags,
  });

  // Per-folder note counts, for the filter chips (only folders in use appear).
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of plainNotes) {
      if (n.folder) counts.set(n.folder, (counts.get(n.folder) ?? 0) + 1);
    }
    return counts;
  }, [plainNotes]);

  const visible = useMemo(() => {
    if (!folderFilter) return plainNotes;
    return plainNotes.filter((n) => n.folder === folderFilter);
  }, [plainNotes, folderFilter]);

  const [submitted, setSubmitted] = useState("");
  const isSearching = submitted.trim().length > 0;
  const search = useNoteSearch(submitted);
  // Search spans every note; keep notes + checklists on this page.
  const hits = (search.data ?? []).filter((h) => h.kind !== "journal");

  async function confirmDelete() {
    if (!deleting) return;
    await deleteNote.mutateAsync(deleting.id);
    setDeleting(null);
  }

  function togglePin(note: Note) {
    togglePinMutation.mutate({ id: note.id, pinned: !note.pinned });
  }

  // Tick a checklist item off (or back on) straight from the card.
  function toggleItem(note: Note, index: number) {
    const items = note.items.map((it, i) =>
      i === index ? { ...it, done: !it.done } : it,
    );
    updateNote.mutate({ id: note.id, input: { items } });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Reflect"
        title={
          <>
            Notes · <AccentText>the things you keep</AccentText>
          </>
        }
        action={<Button onClick={editors.openNew}>+ New note</Button>}
      />

      {/* Search + folder filter chips */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(query.trim());
          }}
          className="relative min-w-[16rem] flex-1"
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
            placeholder="Search notes and checklists…"
            aria-label="Search notes"
            className="w-full rounded-full border border-transparent bg-surface/70 py-2.5 pl-5 pr-11 text-sm text-foreground placeholder:text-muted/60 transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring"
          />
          <button
            type="submit"
            aria-label="Search"
            disabled={query.trim() === ""}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-grape text-white transition hover:bg-grape/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-40 disabled:hover:bg-grape"
          >
            →
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5">
          <FolderChip
            label="All"
            count={plainNotes.length}
            active={folderFilter === null}
            onClick={() => setFolderFilter(null)}
          />
          {NOTE_FOLDERS.filter((f) => (folderCounts.get(f.slug) ?? 0) > 0).map((f) => (
            <FolderChip
              key={f.slug}
              label={f.label}
              count={folderCounts.get(f.slug) ?? 0}
              active={folderFilter === f.slug}
              onClick={() =>
                setFolderFilter(folderFilter === f.slug ? null : f.slug)
              }
            />
          ))}
        </div>
      </div>

      {/* Count line */}
      {!isSearching && (
        <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted/70">
          <span>
            {visible.length} note{visible.length === 1 ? "" : "s"}
          </span>
          <span>Pinned notes stay at the top</span>
        </div>
      )}

      {/* Content — backend full-text search when there's a query, else browse */}
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
            description={`No notes match “${submitted.trim()}”.`}
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
                  onEdit={editors.openEdit}
                  onDelete={setDeleting}
                  onTogglePin={togglePin}
                  onToggleItem={toggleItem}
                  reminderCount={reminderCountByNote.get(hit.id) ?? 0}
                />
              ))}
            </CardGrid>
          </>
        )
      ) : isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : plainNotes.length === 0 ? (
        <EmptyState
          icon="🗒️"
          title={
            <>
              Nothing <AccentText tone="grape">kept</AccentText> yet
            </>
          }
          description="Jot down an order that works, a recipe, or a shopping list to get started."
          action={<Button onClick={editors.openNew}>+ New note</Button>}
        />
      ) : (
        <CardGrid>
          {visible.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={editors.openEdit}
              onDelete={setDeleting}
              onTogglePin={togglePin}
              onToggleItem={toggleItem}
              reminderCount={reminderCountByNote.get(note.id) ?? 0}
            />
          ))}
          <NewNoteTile onClick={editors.openNew} />
        </CardGrid>
      )}

      {editors.modals}

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

/** A pill in the folder filter bar: label + count, active when selected. */
function FolderChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Chip asChild interactive size="lg" tone={active ? "solid" : "soft"}>
      <button type="button" onClick={onClick} aria-pressed={active}>
        {label}{" "}
        <span className={active ? "text-on-accent/70" : "text-grape-deep/60"}>
          {count}
        </span>
      </button>
    </Chip>
  );
}

/** The dashed "add" tile that closes out the grid. */
function NewNoteTile({ onClick }: { onClick: () => void }) {
  return (
    <Card asChild interactive tone="dashed" padding="none">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[9rem] flex-col items-center justify-center gap-1 text-muted transition hover:text-grape"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="text-sm font-semibold">New note</span>
      </button>
    </Card>
  );
}
