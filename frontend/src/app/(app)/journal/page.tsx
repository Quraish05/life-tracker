"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Note } from "@/types/note";
import { useDeleteNote, useNotes } from "@/lib/queries/use-notes";
import type { MoodKey } from "@/lib/validations/note";
import { useDeleteWithUndo } from "@/lib/hooks/use-delete-with-undo";
import { Button } from "@/components/ui/atoms/button";
import { UndoToast } from "@/components/ui/molecules/undo-toast";
import { useNoteEditorStack } from "@/components/notes/use-note-editor-stack";
import { AskJournal } from "@/components/journal/ask-journal";
import { EntryPreviewDrawer } from "@/components/journal/entry-preview-drawer";
import { EntryRow } from "@/components/journal/entry-row";
import { MoodFilterBar } from "@/components/journal/mood-filter-bar";
import { computeStreak, groupByMonth } from "@/components/journal/_lib";

export default function JournalPage() {
  const { data: notes = [], isLoading } = useNotes();
  const deleteNote = useDeleteNote();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<"all" | MoodKey>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const editors = useNoteEditorStack({ fixedKind: "journal" });
  const { pending, canUndo, startDelete, undoDelete } = useDeleteWithUndo<Note>({
    onCommit: (id) => deleteNote.mutate(id),
  });

  function handleDelete(note: Note) {
    if (selectedId === note.id) setSelectedId(null);
    startDelete(note);
  }

  // Journal entries only, newest date first.
  const journalNotes = useMemo(
    () =>
      notes
        .filter((n) => n.kind === "journal")
        .sort((a, b) => (b.entry_date ?? "").localeCompare(a.entry_date ?? "")),
    [notes],
  );

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      journalNotes.filter((n) => {
        if (pending && n.id === pending.id) return false;
        if (mood !== "all" && n.mood !== mood) return false;
        if (q && !`${n.title} ${n.body_md} ${n.tags.join(" ")}`.toLowerCase().includes(q))
          return false;
        return true;
      }),
    [journalNotes, pending, mood, q],
  );

  const groups = useMemo(() => groupByMonth(visible), [visible]);
  const streak = useMemo(() => computeStreak(journalNotes), [journalNotes]);

  // Resolve against all journal entries (not just the filtered view) so a citation
  // chip from "Ask my journal" can open its entry even when it's filtered out.
  const selected =
    selectedId != null ? journalNotes.find((n) => n.id === selectedId) ?? null : null;

  const isFiltering = q.length > 0 || mood !== "all";
  const totalLabel = `${journalNotes.length} ${journalNotes.length === 1 ? "entry" : "entries"}`;
  const countLabel = isFiltering
    ? `Showing ${visible.length} of ${journalNotes.length}`
    : "Newest first";

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col px-4 py-8 tablet:px-6 tablet:py-10">
      {/* Header */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            Reflect
          </p>
          <h1 className="mt-1.5 text-3xl font-normal tracking-tight text-foreground">
            Journal ·{" "}
            <span className="font-display italic text-grape">{totalLabel}</span>
          </h1>
        </div>
        <Button onClick={editors.openNew}>+ New entry</Button>
      </div>

      {/* Ask my journal (RAG) */}
      <div className="mt-5">
        <AskJournal onOpenEntry={setSelectedId} />
      </div>

      {/* Search + mood filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <span className="text-xs text-muted">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries…"
            aria-label="Search journal entries"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted/60"
          />
        </div>
        <MoodFilterBar value={mood} onChange={setMood} />
      </div>

      {/* Count + streak */}
      <div className="mt-4 flex items-center gap-3 border-b border-border pb-3 text-[11px] text-muted">
        <span>{countLabel}</span>
        {streak >= 2 && (
          <span className="ml-auto font-bold text-grape">{streak}-day streak</span>
        )}
      </div>

      {/* List */}
      <div className="mt-4 flex-1">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-center">
            <span className="text-2xl">📓</span>
            <p className="text-sm font-bold text-foreground">
              {isFiltering ? "Nothing matches that filter" : "No entries yet"}
            </p>
            <p className="max-w-[40ch] text-xs leading-relaxed text-muted">
              {isFiltering
                ? "Try a different mood or clear the search — your other entries are still here."
                : "A line a day is enough. Write your first entry to get started."}
            </p>
            {!isFiltering && (
              <Button variant="secondary" size="sm" onClick={editors.openNew}>
                Write today&rsquo;s entry
              </Button>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.title} className="mb-2">
              <p className="mb-2 mt-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                {g.title}
              </p>
              <div className="flex flex-col gap-1.5">
                {g.items.map((note) => (
                  <EntryRow
                    key={note.id}
                    note={note}
                    active={selectedId === note.id}
                    onSelect={() => setSelectedId(note.id)}
                    onOpen={() => router.push(`/journal/${note.id}`)}
                    onEdit={() => editors.openEdit(note)}
                    onDelete={() => handleDelete(note)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview drawer */}
      {selected && (
        <EntryPreviewDrawer
          note={selected}
          onClose={() => setSelectedId(null)}
          onEdit={editors.openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Delete confirmation + undo */}
      <UndoToast
        open={pending != null}
        message="Entry deleted"
        canUndo={canUndo}
        onUndo={undoDelete}
      />

      {/* Create / edit → reminder → follow-up */}
      {editors.modals}
    </div>
  );
}
