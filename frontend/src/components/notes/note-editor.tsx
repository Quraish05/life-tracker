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
import { Button } from "@/components/ui/button";
import { FieldError, FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { ModalOverlay } from "@/components/ui/modal";
import { MarkdownEditor } from "@/components/notes/markdown-editor";
import { TagInput } from "@/components/notes/tag-input";
import { optionPillClass, today } from "@/components/notes/_lib";

const KIND_OPTIONS: { value: NoteKind; label: string; emoji: string }[] = [
  { value: "journal", label: "Journal", emoji: "📓" },
  { value: "note", label: "Note", emoji: "🗒️" },
];

type Props = {
  /** The note being edited, or null when creating a new one. */
  note: Note | null;
  /** Existing tags across all notes, offered as suggestions. */
  allTags?: string[];
  onClose: () => void;
  onSaved: () => void;
};

export function NoteEditor({ note, allTags = [], onClose, onSaved }: Props) {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

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
    <ModalOverlay className="z-50 items-start overflow-y-auto sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        className="my-auto w-full max-w-3xl rounded-3xl border border-white/70 bg-cream shadow-2xl shadow-grape/20"
      >
        <div className="flex items-center justify-between border-b border-lilac/40 px-6 py-4">
          <h2 className="text-lg font-bold text-ink">
            {note ? "Edit" : "New"}{" "}
            <span className="font-display italic text-grape">
              {kind === "journal" ? "journal entry" : "note"}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-coral/15 hover:text-coral"
          >
            ✕
          </button>
        </div>

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

          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
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
      </div>
    </ModalOverlay>
  );
}
