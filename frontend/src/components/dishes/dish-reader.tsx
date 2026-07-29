"use client";

import { useState } from "react";

import type { Dish } from "@/types/dish";
import { Card } from "@/components/ui/atoms/card";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { formatDate } from "@/components/notes/_lib";

type Props = {
  /** The dish to read, or null when the library has no selection. */
  dish: Dish | null;
  onEdit: (dish: Dish) => void;
  onDelete: (dish: Dish) => void;
};

/** Right pane of the recipe binder: the selected dish, read in full. */
export function DishReader({ dish, onEdit, onDelete }: Props) {
  // Ephemeral "tick as you cook/shop" state. The page keys this component by
  // dish id, so switching dishes remounts it and clears the checks — no effect.
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!dish) {
    return (
      <Card
        tone="dashed"
        padding="lg"
        className="flex min-h-64 flex-col items-center justify-center text-center"
      >
        <span className="text-3xl">🍽️</span>
        <p className="mt-3 text-sm text-muted">
          Pick a dish from the list to read it.
        </p>
      </Card>
    );
  }

  const count = dish.ingredients.length;

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <Card tone="glass" padding="none" className="overflow-hidden">
      {/* Header band */}
      <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-lilac/60 via-blush/40 to-peach/50 px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-grape">
            🍽️ Dish
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {dish.name}
          </h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton size="md" onClick={() => onEdit(dish)} aria-label="Edit">
            ✏️
          </IconButton>
          <IconButton
            size="md"
            onClick={() => onDelete(dish)}
            aria-label="Delete"
            tone="danger"
          >
            🗑️
          </IconButton>
        </div>
      </div>

      <div className="space-y-6 px-6 py-5">
        {/* Ingredients — a tickable checklist */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted/80">
            Ingredients
            {count > 0 && (
              <span className="rounded-full bg-lilac/40 px-2 py-0.5 text-xs text-grape-deep">
                {count}
              </span>
            )}
          </h3>
          {count === 0 ? (
            <p className="mt-2 text-sm text-muted/70 italic">
              No ingredients listed.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-lilac/30">
              {dish.ingredients.map((ing, i) => {
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
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition ${
                          done
                            ? "border-grape bg-grape text-white"
                            : "border-border text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`text-sm transition ${
                          done ? "text-muted/60 line-through" : "text-foreground"
                        }`}
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
        </section>

        {/* Recipe — rendered markdown */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted/80">
            Recipe
          </h3>
          <div className="mt-2 text-sm">
            {dish.recipe_md ? (
              <MarkdownPreview>{dish.recipe_md}</MarkdownPreview>
            ) : (
              <p className="text-sm text-muted/70 italic">
                No recipe yet — add one with Edit.
              </p>
            )}
          </div>
        </section>

        <p className="text-xs font-semibold text-muted/70">
          Updated {formatDate(dish.updated_at)}
        </p>
      </div>
    </Card>
  );
}
