"use client";

import { useState } from "react";

import type { ExerciseLog } from "@/types/exercise";
import { EXERCISE_NAME_MAX, EXERCISE_NOTE_MAX } from "@/lib/validations/exercise";
import { Button } from "@/components/ui/atoms/button";
import { IconButton } from "@/components/ui/atoms/icon-button";

type Props = {
  exercises: ExerciseLog[];
  onAdd: (name: string, note: string) => void;
  onDelete: (exercise: ExerciseLog) => void;
};

const controlClass =
  "min-w-0 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring";

/** A day's workout: an add/remove list of exercises (name + optional note). */
export function DayExercises({ exercises, onAdd, onDelete }: Props) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, note.trim());
    setName("");
    setNote("");
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-surface/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">💪</span>
        <h3 className="font-bold text-foreground">Exercises</h3>
        {exercises.length > 0 && (
          <span className="rounded-full bg-lilac/40 px-2 py-0.5 text-xs font-semibold text-grape-deep">
            {exercises.length}
          </span>
        )}
      </div>

      {exercises.length === 0 ? (
        <p className="mb-2 text-sm text-muted/70 italic">Nothing logged.</p>
      ) : (
        <ul className="mb-2 space-y-1.5">
          {exercises.map((ex) => (
            <li
              key={ex.id}
              className="group flex items-center gap-2 rounded-xl bg-surface/70 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-foreground">{ex.name}</span>
                {ex.note && (
                  <span className="ml-2 text-sm text-muted">· {ex.note}</span>
                )}
              </div>
              <IconButton
                onClick={() => onDelete(ex)}
                aria-label={`Remove ${ex.name}`}
                tone="danger"
              >
                ✕
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Exercise (e.g. Bench press)"
          maxLength={EXERCISE_NAME_MAX}
          aria-label="Exercise name"
          className={`${controlClass} flex-[2]`}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Note (3×12, 30 min…)"
          maxLength={EXERCISE_NOTE_MAX}
          aria-label="Exercise note"
          className={`${controlClass} flex-1`}
        />
        <Button type="button" size="sm" onClick={submit} disabled={!name.trim()}>
          Add
        </Button>
      </div>
    </section>
  );
}
