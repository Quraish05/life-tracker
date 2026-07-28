"use client";

import { useState } from "react";

import type { Dish } from "@/types/dish";
import { MEAL_NOTE_MAX } from "@/lib/validations/meal";
import { Button } from "@/components/ui/atoms/button";

type Props = {
  dishes: Dish[];
  onAdd: (dishId: number, note: string) => void;
  /** Open the dish editor to create a new dish for this slot. */
  onCreateNew: () => void;
};

const controlClass =
  "w-full rounded-xl border border-lilac/60 bg-cream/80 px-3 py-2 text-sm text-ink transition focus:border-grape focus:bg-white focus:outline-none focus:ring-4 focus:ring-lilac";

/** Inline "add a dish to this slot" control: pick from the library (+ note),
 * or jump to creating a brand-new dish. */
export function DishPicker({ dishes, onAdd, onCreateNew }: Props) {
  const [open, setOpen] = useState(false);
  const [dishId, setDishId] = useState<number | "">("");
  const [note, setNote] = useState("");

  function reset() {
    setDishId("");
    setNote("");
    setOpen(false);
  }

  function submit() {
    if (dishId === "") return;
    onAdd(Number(dishId), note.trim());
    reset();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-grape/25 px-3 py-2 text-sm font-semibold text-ink/60 transition hover:border-grape/40 hover:bg-white/60 hover:text-grape"
      >
        + Add dish
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-lilac/50 bg-white/70 p-3">
      {dishes.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No dishes in your library yet.{" "}
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
            value={dishId}
            onChange={(e) =>
              setDishId(e.target.value === "" ? "" : Number(e.target.value))
            }
            aria-label="Choose a dish"
            className={controlClass}
          >
            <option value="">Choose a dish…</option>
            {dishes.map((d) => (
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
              + New dish
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={reset}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={submit} disabled={dishId === ""}>
                Add
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
