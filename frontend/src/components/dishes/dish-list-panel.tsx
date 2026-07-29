"use client";

import type { Dish } from "@/types/dish";

type Props = {
  /** The dishes to list (already filtered by the current search). */
  dishes: Dish[];
  /** Total dishes before filtering — decides whether the search box shows. */
  total: number;
  activeId: number | null;
  onSelect: (id: number) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onNew: () => void;
};

/** Left pane of the recipe binder: search + a selectable list of dish names. */
export function DishListPanel({
  dishes,
  total,
  activeId,
  onSelect,
  query,
  onQueryChange,
  onNew,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {total > 3 && (
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search dishes…"
          className="rounded-xl border border-border/60 bg-surface/70 px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring"
        />
      )}

      <ul className="max-h-[22rem] space-y-1 overflow-y-auto pr-0.5 laptop:max-h-[calc(100vh-15rem)]">
        {dishes.length === 0 ? (
          <li className="px-3.5 py-2.5 text-sm text-muted">No dishes match.</li>
        ) : (
          dishes.map((dish) => {
            const active = dish.id === activeId;
            return (
              <li key={dish.id}>
                <button
                  type="button"
                  onClick={() => onSelect(dish.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-surface text-grape shadow-sm shadow-grape/10"
                      : "text-foreground/70 hover:bg-surface/60 hover:text-foreground"
                  }`}
                >
                  <span className="min-w-0 truncate">{dish.name}</span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      active ? "text-grape/70" : "text-muted/70"
                    }`}
                  >
                    {dish.ingredients.length}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      <button
        type="button"
        onClick={onNew}
        className="rounded-2xl border-2 border-dashed border-grape/25 px-3.5 py-2.5 text-sm font-semibold text-foreground/60 transition hover:border-grape/40 hover:bg-surface/50 hover:text-grape"
      >
        + New dish
      </button>
    </div>
  );
}
