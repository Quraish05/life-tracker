"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  reminderSchema,
  type ReminderInput,
  type TargetType,
} from "@/lib/validations/reminder";
import { type Reminder } from "@/lib/reminders";
import { useCreateReminder, useUpdateReminder } from "@/lib/use-reminders";
import { useNotes } from "@/lib/use-notes";
import { Button } from "@/components/ui/atoms/button";
import { FieldError, FormError } from "@/components/ui/atoms/form-error";
import { FormField } from "@/components/ui/molecules/form-field";
import { Label } from "@/components/ui/atoms/label";
import { ModalOverlay } from "@/components/ui/molecules/modal";
import { Textarea } from "@/components/ui/atoms/textarea";
import {
  defaultRemindAtIso,
  fromDatetimeLocal,
  toDatetimeLocal,
} from "@/components/reminders/_lib";

type Props = {
  /** The reminder being edited, or null when creating a new one. */
  reminder: Reminder | null;
  /** Pre-select an attachment when creating (e.g. opened from a note). */
  presetTarget?: { targetType: TargetType; targetId: number };
  onClose: () => void;
  onSaved: () => void;
};

export function ReminderEditor({
  reminder,
  presetTarget,
  onClose,
  onSaved,
}: Props) {
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const { data: notes = [] } = useNotes();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReminderInput>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: reminder?.title ?? "",
      body: reminder?.body ?? "",
      remind_at: reminder?.remind_at ?? defaultRemindAtIso(),
      target_type: reminder?.target_type ?? presetTarget?.targetType ?? null,
      target_id: reminder?.target_id ?? presetTarget?.targetId ?? null,
    },
  });

  const targetId = watch("target_id");

  // Close on Escape for a native modal feel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(values: ReminderInput) {
    // Trimming happens in the schema; an empty body is sent as "" which the
    // API stores as null (and, on edit, clears any previous detail).
    try {
      if (reminder) await updateReminder.mutateAsync({ id: reminder.id, input: values });
      else await createReminder.mutateAsync(values);
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
        className="my-auto w-full max-w-2xl rounded-3xl border border-white/70 bg-cream shadow-2xl shadow-grape/20"
      >
        <div className="flex items-center justify-between border-b border-lilac/40 px-6 py-4">
          <h2 className="text-lg font-bold text-ink">
            {reminder ? "Edit" : "New"}{" "}
            <span className="font-display italic text-grape">reminder</span>
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

          <FormField
            label="What should we remind you about?"
            id="title"
            placeholder="e.g. Leg day at the gym"
            error={errors.title?.message}
            {...register("title")}
          />

          <Controller
            control={control}
            name="remind_at"
            render={({ field }) => (
              <FormField
                label="When"
                id="remind_at"
                type="datetime-local"
                value={field.value ? toDatetimeLocal(field.value) : ""}
                onChange={(e) =>
                  field.onChange(e.target.value ? fromDatetimeLocal(e.target.value) : "")
                }
                error={errors.remind_at?.message}
              />
            )}
          />

          <div className="space-y-1.5">
            <Label htmlFor="body">Details (optional)</Label>
            <Textarea
              id="body"
              rows={3}
              placeholder="Anything to add?"
              aria-invalid={errors.body ? "true" : undefined}
              {...register("body")}
            />
            <FieldError message={errors.body?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attach">Attach to a note (optional)</Label>
            <select
              id="attach"
              value={targetId ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setValue("target_type", null);
                  setValue("target_id", null);
                } else {
                  setValue("target_type", "note");
                  setValue("target_id", Number(value));
                }
              }}
              className="w-full rounded-xl border border-lilac/60 bg-cream/80 px-4 py-2.5 text-sm text-ink transition focus:border-grape focus:bg-white focus:outline-none focus:ring-4 focus:ring-lilac"
            >
              <option value="">None — standalone reminder</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.kind === "journal" ? "📓" : "🗒️"} {note.title}
                </option>
              ))}
            </select>
            <FieldError message={errors.target_id?.message} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : reminder ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
