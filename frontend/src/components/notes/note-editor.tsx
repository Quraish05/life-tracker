"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  MOODS,
  noteSchema,
  type NoteInput,
  type NoteKind,
} from "@/lib/validations/note";
import { type Note } from "@/lib/notes";
import { useCreateNote, useUpdateNote } from "@/lib/use-notes";
import { useReminders } from "@/lib/use-reminders";
import { Button } from "@/components/ui/atoms/button";
import { Chip } from "@/components/ui/atoms/chip";
import { FieldError, FormError } from "@/components/ui/atoms/form-error";
import { FormField } from "@/components/ui/molecules/form-field";
import { Label } from "@/components/ui/atoms/label";
import {
  ModalDialog,
  ModalHeader,
  ModalOverlay,
} from "@/components/ui/molecules/modal";
import { MarkdownEditor } from "@/components/notes/markdown-editor";
import { TagInput } from "@/components/notes/tag-input";
import { optionPillClass, today } from "@/components/notes/_lib";
import {
  formatWhen,
  reminderStatus,
  STATUS_META,
} from "@/components/reminders/_lib";

const KIND_OPTIONS: { value: NoteKind; label: string; emoji: string }[] = [
  { value: "journal", label: "Journal", emoji: "📓" },
  { value: "note", label: "Note", emoji: "🗒️" },
];

type Props = {
  /** The note being edited, or null when creating a new one. */
  note: Note | null;
  /** Existing tags across all notes, offered as suggestions. */
  allTags?: string[];
  /** Open the reminder editor pre-attached to this note. */
  onAddReminder?: (note: Note) => void;
  onClose: () => void;
  onSaved: () => void;
};

export function NoteEditor({
  note,
  allTags = [],
  onAddReminder,
  onClose,
  onSaved,
}: Props) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const { data: reminders = [] } = useReminders();

  // Reminders pointing at this note — only relevant once it's been saved.
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      kind: note?.kind ?? "journal",
      title: note?.title ?? "",
      body_md: note?.body_md ?? "",
      entry_date: note?.entry_date ?? today(),
      tags: note?.tags ?? [],
      mood: note?.mood ?? null,
      pinned: note?.pinned ?? false,
    },
  });

  const kind = watch("kind");

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

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto tablet:p-8">
      <ModalDialog size="lg" className="my-auto">
        <ModalHeader onClose={onClose}>
          {note ? "Edit" : "New"}{" "}
          <span className="font-display italic text-grape">
            {kind === "journal" ? "journal entry" : "note"}
          </span>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 px-6 py-5">
          <FormError message={errors.root?.message} />

          {/* Kind selector */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <div className="flex gap-2">
                  {KIND_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${optionPillClass(
                        field.value === opt.value,
                      )}`}
                    >
                      <span>{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid gap-5 tablet:grid-cols-[1fr_auto]">
            <FormField
              label="Title"
              id="title"
              placeholder={kind === "journal" ? "How was today?" : "Give it a name"}
              error={errors.title?.message}
              {...register("title")}
            />
            {kind === "journal" && (
              <FormField
                label="Date"
                id="entry_date"
                type="date"
                error={errors.entry_date?.message}
                {...register("entry_date")}
              />
            )}
          </div>

          {kind === "journal" && (
            <div className="space-y-1.5">
              <Label>Mood</Label>
              <Controller
                control={control}
                name="mood"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        // Click the active mood again to clear it.
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

          <div className="space-y-1.5">
            <Label htmlFor="body_md">
              {kind === "journal" ? "Entry" : "Content"}
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
                  placeholder="Write in markdown — use the toolbar above ✨"
                />
              )}
            />
            <FieldError message={errors.body_md?.message} />
          </div>

          {/* Tags — category + hashtags, created on the fly */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={allTags}
                />
              )}
            />
            <FieldError message={errors.tags?.message} />
          </div>

          {/* Attached reminders — read-only mention + quick create */}
          {note && (
            <div className="space-y-2.5 rounded-2xl border border-lilac/40 bg-white/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Reminders</Label>
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
              {attachedReminders.length === 0 ? (
                <p className="text-sm text-ink-soft">
                  No reminders attached to this{" "}
                  {kind === "journal" ? "entry" : "note"} yet.
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
                        <span className="font-semibold text-ink">
                          {reminder.title}
                        </span>
                        <span className="text-ink-soft">
                          · {formatWhen(reminder.remind_at)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Controller
              control={control}
              name="pinned"
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  aria-pressed={field.value}
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${optionPillClass(
                    field.value,
                  )}`}
                >
                  <span>📌</span>
                  {field.value ? "Pinned" : "Pin to top"}
                </button>
              )}
            />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : note ? "Save changes" : "Create"}
              </Button>
            </div>
          </div>
        </form>
      </ModalDialog>
    </ModalOverlay>
  );
}
