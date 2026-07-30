"use client";

import type { FoodItem } from "@/types/food";
import { cn } from "@/lib/utils";

type Props = {
  /** The foods to list (already filtered and sorted by the page). */
  foods: FoodItem[];
  activeId: number | null;
  onSelect: (id: number) => void;
};

/** A short preview of what's in a food — its first few ingredients, else a hint. */
function summarize(food: FoodItem): string {
  const names = food.ingredients.map((i) => i.name.trim()).filter(Boolean);
  if (names.length) return names.slice(0, 3).join(", ");
  return food.recipe_md ? "Has a recipe" : "No ingredients yet";
}

/** Main pane of the recipe binder: a scannable, selectable list of foods. */
export function FoodListPanel({ foods, activeId, onSelect }: Props) {
  return (
    <div>
      {/* Column header */}
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3.5 pb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
        <span aria-hidden />
        <span>Food</span>
        <span className="text-right">Ingredients</span>
      </div>

      <ul className="mt-2 space-y-1.5">
        {foods.length === 0 ? (
          <li className="px-3.5 py-6 text-center text-sm text-muted">
            No foods match.
          </li>
        ) : (
          foods.map((food) => {
            const active = food.id === activeId;
            const count = food.ingredients.length;
            return (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => onSelect(food.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition",
                    active
                      ? "border-grape/30 bg-grape/10"
                      : "border-border bg-surface hover:bg-grape/8",
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-[15px]">
                    🍽️
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-foreground">
                      {food.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {summarize(food)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[13px] font-bold text-foreground">
                      {count}
                    </span>
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-muted/70">
                      {count === 1 ? "item" : "items"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
