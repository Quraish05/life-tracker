"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  MOODS,
  noteSchema,
  type ChecklistItem,
  type NoteInput,
  type NoteKind,
} from "@/lib/validations/note";
import { canSuggestFollowUps } from "@/lib/notes";
import type { Note } from "@/types/note";
import { NOTE_FOLDERS } from "@/constants/notes";
import { useCreateNote, useUpdateNote } from "@/lib/queries/use-notes";
import { useReminders } from "@/lib/queries/use-reminders";
import { Button } from "@/components/ui/atoms/button";
import { Chip } from "@/components/ui/atoms/chip";
import { FieldError, FormError } from "@/components/ui/atoms/form-error";
import { Input } from "@/components/ui/atoms/input";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { Label } from "@/components/ui/atoms/label";
import { ModalDialog, ModalOverlay } from "@/components/ui/molecules/modal";
import { MarkdownEditor } from "@/components/notes/markdown-editor";
import { TagInput } from "@/components/notes/tag-input";
import { TagSuggestions } from "@/components/notes/tag-suggestions";
import { optionPillClass, today } from "@/components/notes/_lib";
import {
  formatWhen,
  reminderStatus,
  STATUS_META,
} from "@/components/reminders/_lib";

type Props = {
  /** The note being edited, or null when creating a new one. */
  note: Note | null;
  /**
   * Lock the note kind (and hide the kind selector). The Notes page passes
   * "note"; the Journal page passes "journal". Falls back to the note's own
   * kind when editing, else "note".
   */
  fixedKind?: NoteKind;
  /** Preselect this folder slug when creating a new note (e.g. active filter). */
  presetFolder?: string | null;
  /** Existing tags across all notes, offered as suggestions. */
  allTags?: string[];
  /** Open the reminder editor pre-attached to this note. */
  onAddReminder?: (note: Note) => void;
  /** Open the AI follow-up suggestions for this note. */
  onSuggestFollowUps?: (note: Note) => void;
  onClose: () => void;
  onSaved: () => void;
};

export function NoteEditor({
  note,
  fixedKind,
  presetFolder = null,
  allTags = [],
  onAddReminder,
  onSuggestFollowUps,
  onClose,
  onSaved,
}: Props) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const { data: reminders = [] } = useReminders();

  const attachedReminders = note
    ? reminders.filter(
        (r) => r.target_type === "note" && r.target_id === note.id,
      )
    : [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      kind: note?.kind ?? fixedKind ?? "note",
      title: note?.title ?? "",
      body_md: note?.body_md ?? "",
      entry_date: note?.entry_date ?? today(),
      tags: note?.tags ?? [],
      folder: note?.folder ?? presetFolder,
      items: note?.items ?? [],
      mood: note?.mood ?? null,
      pinned: note?.pinned ?? false,
    },
  });

  const kind = watch("kind");
  const isJournal = kind === "journal";
  const isChecklist = kind === "checklist";

  // Switch a note's shape between text and checklist. Seed one empty row when
  // becoming a checklist so there's something to type into.
  function setNoteType(next: "note" | "checklist") {
    if (next === "checklist" && getValues("items").length === 0) {
      setValue("items", [{ text: "", done: false }]);
    }
    setValue("kind", next, { shouldValidate: false });
  }

  // Close on Escape for a native modal feel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(values: NoteInput) {
    try {
      if (note) await updateNote.mutateAsync({ id: note.id, input: values });
      else await createNote.mutateAsync(values);
      onSaved();
    } catch {
      setError("root", { message: "Couldn't save. Please try again." });
    }
  }

  const sectionLabel = "text-xs font-semibold uppercase tracking-wide text-muted";

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto tablet:p-8">
      <ModalDialog size="lg" className="my-auto">
        {/* Header — eyebrow + title, with pin + close on the right */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lilac/40 text-lg">
              {isJournal ? "📓" : "🗒️"}
            </span>
            <div>
              <p className={sectionLabel}>{isJournal ? "Journal" : "Notes"}</p>
              <h2 className="text-lg font-bold text-foreground">
                {note ? "Edit" : "New"} {isJournal ? "journal entry" : "note"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="pinned"
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  aria-pressed={field.value}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${optionPillClass(
                    field.value,
                  )}`}
                >
                  <span>📌</span>
                  {field.value ? "Pinned" : "Pin"}
                </button>
              )}
            />
            <IconButton tone="danger" aria-label="Close" onClick={onClose}>
              ✕
            </IconButton>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 px-6 py-5">
          <FormError message={errors.root?.message} />

          {/* Title (+ date for journal entries) */}
          <div className="grid gap-5 tablet:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="title" className={sectionLabel}>
                Title
              </Label>
              <Input
                id="title"
                placeholder={isJournal ? "How was today?" : "Give it a name"}
                aria-invalid={errors.title ? "true" : undefined}
                {...register("title")}
              />
              <FieldError message={errors.title?.message} />
            </div>
            {isJournal && (
              <div className="space-y-1.5">
                <Label htmlFor="entry_date" className={sectionLabel}>
                  Date
                </Label>
                <Input id="entry_date" type="date" {...register("entry_date")} />
                <FieldError message={errors.entry_date?.message} />
              </div>
            )}
          </div>

          {/* Mood (journal only) */}
          {isJournal && (
            <div className="space-y-1.5">
              <Label className={sectionLabel}>Mood</Label>
              <Controller
                control={control}
                name="mood"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() =>
                          field.onChange(field.value === m.key ? null : m.key)
                        }
                        title={m.label}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${optionPillClass(
                          field.value === m.key,
                        )}`}
                      >
                        <span className="text-base">{m.emoji}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          {/* Type toggle (notes only) — text note vs checklist */}
          {!isJournal && (
            <div className="flex items-center justify-between gap-3">
              <Label className={sectionLabel}>Type</Label>
              <div className="flex rounded-xl border border-border bg-background/60 p-1">
                {(["note", "checklist"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNoteType(t)}
                    aria-pressed={kind === t}
                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                      kind === t
                        ? "bg-surface text-grape shadow-sm"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {t === "note" ? "Note" : "Checklist"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content — checklist rows, or a markdown body */}
          {isChecklist ? (
            <div className="space-y-1.5">
              <Controller
                control={control}
                name="items"
                render={({ field }) => (
                  <ChecklistItemsEditor
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError message={errors.items?.message} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="body_md" className={sectionLabel}>
                {isJournal ? "Entry" : "Content"}
              </Label>
              <Controller
                control={control}
                name="body_md"
                render={({ field }) => (
                  <MarkdownEditor
                    id="body_md"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.body_md?.message}
                    placeholder={
                      isJournal
                        ? "Write in markdown — use the toolbar above ✨"
                        : "Anything you want to find again — orders that work, macros you keep forgetting, what the dietitian said."
                    }
                  />
                )}
              />
              <FieldError message={errors.body_md?.message} />
            </div>
          )}

          {/* Folder (notes only) — single-select bucket */}
          {!isJournal && (
            <div className="space-y-1.5">
              <Label className={sectionLabel}>Folder</Label>
              <Controller
                control={control}
                name="folder"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {NOTE_FOLDERS.map((f) => {
                      const active = field.value === f.slug;
                      return (
                        <button
                          key={f.slug}
                          type="button"
                          // Click the active folder again to clear it.
                          onClick={() =>
                            field.onChange(active ? null : f.slug)
                          }
                          aria-pressed={active}
                          className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                            active
                              ? f.active
                              : "border-border bg-background/60 text-foreground/70 hover:bg-surface"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${f.dot}`} />
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          )}

          {/* Tags — kept for search + AI; secondary to the folder */}
          <div className="space-y-1.5">
            <Label className={sectionLabel}>Tags</Label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <div className="space-y-2.5">
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    suggestions={allTags}
                  />
                  <TagSuggestions
                    control={control}
                    current={field.value}
                    onAdd={(tag) => field.onChange([...field.value, tag])}
                  />
                </div>
              )}
            />
            <FieldError message={errors.tags?.message} />
          </div>

          {/* Attached reminders — read-only mention + quick create */}
          {note && (
            <div className="space-y-2.5 rounded-2xl border border-border/40 bg-surface/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className={sectionLabel}>Reminders</Label>
                <div className="flex flex-wrap gap-2">
                  {onSuggestFollowUps && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onSuggestFollowUps(note)}
                      disabled={!canSuggestFollowUps(note)}
                      title={
                        canSuggestFollowUps(note)
                          ? undefined
                          : "Add a bit more detail to this entry to get follow-up suggestions."
                      }
                    >
                      ✨ Suggest follow-ups
                    </Button>
                  )}
                  {onAddReminder && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onAddReminder(note)}
                    >
                      🔔 Remind me about this
                    </Button>
                  )}
                </div>
              </div>
              {attachedReminders.length === 0 ? (
                <p className="text-sm text-muted">
                  No reminders attached to this{" "}
                  {isJournal ? "entry" : "note"} yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {attachedReminders.map((reminder) => {
                    const meta = STATUS_META[reminderStatus(reminder)];
                    return (
                      <li
                        key={reminder.id}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                      >
                        <Chip tone={meta.tone} size="sm">
                          {meta.label}
                        </Chip>
                        <span className="font-semibold text-foreground">
                          {reminder.title}
                        </span>
                        <span className="text-muted">
                          · {formatWhen(reminder.remind_at)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-sm text-muted">
            {isJournal
              ? "Markdown supported"
              : isChecklist
                ? `${watch("items").filter((i) => i.text.trim()).length} item${
                    watch("items").filter((i) => i.text.trim()).length === 1
                      ? ""
                      : "s"
                  } · tick them off any time`
                : "Plain text — searchable from anywhere"}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? "Saving…" : note ? "Save changes" : "Create"}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </ModalOverlay>
  );
}

/** Editable checklist rows: tick, edit text, remove, and add. */
function ChecklistItemsEditor({
  value,
  onChange,
}: {
  value: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  // Always show at least one row to type into.
  const items = value.length ? value : [{ text: "", done: false }];

  function update(index: number, patch: Partial<ChecklistItem>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...items, { text: "", done: false }]);
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2"
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={item.done}
            aria-label={item.text || "Checklist item"}
            onClick={() => update(i, { done: !item.done })}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs leading-none transition ${
              item.done
                ? "border-grape bg-grape text-on-accent"
                : "border-border hover:border-grape"
            }`}
          >
            {item.done ? "✓" : ""}
          </button>
          <input
            type="text"
            value={item.text}
            onChange={(e) => update(i, { text: e.target.value })}
            placeholder="List item"
            className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted/50 ${
              item.done ? "text-muted line-through" : "text-foreground"
            }`}
          />
          <button
            type="button"
            aria-label="Remove item"
            onClick={() => remove(i)}
            className="shrink-0 text-muted transition hover:text-coral"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full rounded-xl border border-dashed border-border py-2 text-sm font-semibold text-muted transition hover:border-grape hover:text-grape"
      >
        + Item
      </button>
    </div>
  );
}
