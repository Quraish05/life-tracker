"use client";

import { useEffect, useState } from "react";

import {
  EXERCISE_NAME_MAX,
  EXERCISE_NOTE_MAX,
} from "@/lib/validations/exercise";
import { useCreateExercise } from "@/lib/queries/use-exercises";
import { Button } from "@/components/ui/atoms/button";
import {
  ModalDialog,
  ModalHeader,
  ModalOverlay,
} from "@/components/ui/molecules/modal";
import { savesToLabel } from "@/components/log/_lib";

/** Common movement types offered as quick-fill chips. */
const QUICK_TYPES = ["Walk", "Run", "Yoga", "Kettlebells", "Cycling", "Swim"];

type Props = {
  /** The day the exercise is saved to (YYYY-MM-DD). */
  date: string;
  onClose: () => void;
  /** Called after the exercise is logged (the parent refreshes + closes). */
  onLogged: () => void;
};

/** "Log an exercise": free-text name (with quick-type chips) + optional note. */
export function LogExerciseModal({ date, onClose, onLogged }: Props) {
  const createExercise = useCreateExercise();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createExercise.mutateAsync({
      log_date: date,
      name: trimmed,
      note: note.trim() || undefined,
    });
    onLogged();
  }

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto py-10">
      <ModalDialog className="max-w-lg" aria-label="Log an exercise">
        <ModalHeader onClose={onClose}>
          <span className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Movement
            </span>
            Log an exercise
          </span>
        </ModalHeader>

        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              What did you do?
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Morning walk"
              maxLength={EXERCISE_NAME_MAX}
              aria-label="Exercise name"
              autoFocus
              className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition focus:border-grape focus:outline-none focus:ring-4 focus:ring-ring"
            />
            <div className="mt-2.5 flex flex-wrap gap-2">
              {QUICK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setName(type)}
                  className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:border-grape/40 hover:bg-grape/8 hover:text-foreground"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Note · optional
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="42 min, felt easy"
              maxLength={EXERCISE_NOTE_MAX}
              aria-label="Exercise note"
              className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition focus:border-grape focus:outline-none focus:ring-4 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <span className="text-xs text-muted">{savesToLabel(date)}</span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!name.trim() || createExercise.isPending}
            >
              {createExercise.isPending ? "Logging…" : "Log exercise"}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </ModalOverlay>
  );
}
