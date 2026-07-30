"use client";

import { useState } from "react";

import type { FoodItem } from "@/types/food";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/atoms/button";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { formatDate } from "@/components/notes/_lib";

type Props = {
  /** The food to read, or null when the library has no selection. */
  food: FoodItem | null;
  onEdit: (food: FoodItem) => void;
  onDelete: (food: FoodItem) => void;
};

const SECTION_LABEL =
  "text-[11px] font-bold uppercase tracking-[0.08em] text-muted";

/** Detail aside of the recipe binder: the selected food, read in full. */
export function FoodReader({ food, onEdit, onDelete }: Props) {
  // Ephemeral "tick as you cook/shop" state. The page keys this component by
  // food id, so switching foods remounts it and clears the checks — no effect.
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!food) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
        <span className="text-3xl">🍽️</span>
        <p className="mt-3 text-sm text-muted">
          Pick a food from the list to read it.
        </p>
      </div>
    );
  }

  const count = food.ingredients.length;

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* Header — emoji, name, and a one-line meta */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-foreground/5 text-xl">
          🍽️
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-foreground">
            {food.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {count} ingredient{count === 1 ? "" : "s"} · updated{" "}
            {formatDate(food.updated_at)}
          </p>
        </div>
      </div>

      {/* Ingredients — a tickable checklist */}
      <p className={cn(SECTION_LABEL, "mt-5")}>Ingredients</p>
      {count === 0 ? (
        <p className="mt-2 text-sm italic text-muted/70">
          No ingredients listed.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {food.ingredients.map((ing, i) => {
            const done = checked.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={done}
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition",
                      done
                        ? "border-grape bg-grape text-on-accent"
                        : "border-border text-transparent",
                    )}
                  >
                    ✓
                  </span>
                  <span
                    className={cn(
                      "text-sm transition",
                      done ? "text-muted/60 line-through" : "text-foreground",
                    )}
                  >
                    {ing.name}
                  </span>
                  {ing.amount && (
                    <span className="ml-auto shrink-0 text-sm font-semibold text-muted">
                      {ing.amount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Recipe — rendered markdown */}
      <p className={cn(SECTION_LABEL, "mt-5")}>Recipe</p>
      <div className="mt-2 text-sm">
        {food.recipe_md ? (
          <MarkdownPreview>{food.recipe_md}</MarkdownPreview>
        ) : (
          <p className="text-sm italic text-muted/70">
            No recipe yet — add one with Edit.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onEdit(food)}
        >
          Edit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDelete(food)}
          className="border-coral/30 text-coral hover:border-coral/50 hover:bg-coral/10 hover:text-coral"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
