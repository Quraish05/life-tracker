"use client";

import type { ExerciseLog } from "@/types/exercise";

type Props = {
  exercises: ExerciseLog[];
  onAdd: () => void;
  onRemove: (exerciseId: number) => void;
};

/** The MOVEMENT block: logged exercises + a button to log another. */
export function MovementList({ exercises, onAdd, onRemove }: Props) {
  return (
    <div className="space-y-3">
      {exercises.map((ex) => (
        <div
          key={ex.id}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-lilac text-lg">
            🏃
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-foreground">
              {ex.name}
            </span>
          </span>
          {ex.note && (
            <span className="flex-none text-sm text-muted">{ex.note}</span>
          )}
          <button
            type="button"
            onClick={() => onRemove(ex.id)}
            aria-label={`Remove ${ex.name}`}
            className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full text-xs text-muted transition hover:bg-coral/20 hover:text-coral"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-grape/25 px-4 py-3 text-sm font-semibold text-foreground/60 transition hover:border-grape/40 hover:bg-surface/60 hover:text-grape"
      >
        + Log an exercise
      </button>
    </div>
  );
}
