"use client";

import { useState } from "react";

import type { FoodItem } from "@/types/food";
import { MEAL_NOTE_MAX } from "@/lib/validations/meal";
import { Button } from "@/components/ui/atoms/button";

type Props = {
  foods: FoodItem[];
  onAdd: (foodId: number, note: string) => void;
  /** Open the food editor to create a new food for this slot. */
  onCreateNew: () => void;
};

const controlClass =
  "w-full rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-sm text-foreground transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring";

/** Inline "add a food to this slot" control: pick from the library (+ note),
 * or jump to creating a brand-new food. */
export function FoodPicker({ foods, onAdd, onCreateNew }: Props) {
  const [open, setOpen] = useState(false);
  const [foodId, setFoodId] = useState<number | "">("");
  const [note, setNote] = useState("");

  function reset() {
    setFoodId("");
    setNote("");
    setOpen(false);
  }

  function submit() {
    if (foodId === "") return;
    onAdd(Number(foodId), note.trim());
    reset();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-grape/25 px-3 py-2 text-sm font-semibold text-foreground/60 transition hover:border-grape/40 hover:bg-surface/60 hover:text-grape"
      >
        + Add food
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border/50 bg-surface/70 p-3">
      {foods.length === 0 ? (
        <p className="text-sm text-muted">
          No foods in your library yet.{" "}
          <button
            type="button"
            onClick={onCreateNew}
            className="font-semibold text-grape underline underline-offset-2 hover:text-grape-deep"
          >
            Create one
          </button>{" "}
          to add it here.
        </p>
      ) : (
        <>
          <select
            value={foodId}
            onChange={(e) =>
              setFoodId(e.target.value === "" ? "" : Number(e.target.value))
            }
            aria-label="Choose a food"
            className={controlClass}
          >
            <option value="">Choose a food…</option>
            {foods.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Portion / note (optional)"
            maxLength={MEAL_NOTE_MAX}
            aria-label="Portion or note"
            className={controlClass}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onCreateNew}
              className="text-xs font-semibold text-grape underline underline-offset-2 hover:text-grape-deep"
            >
              + New food
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={reset}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={submit} disabled={foodId === ""}>
                Add
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
