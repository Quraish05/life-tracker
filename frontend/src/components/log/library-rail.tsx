"use client";

import Link from "next/link";

type Props = {
  foodCount: number;
  ingredientCount: number;
  onNewFood: () => void;
  onNewIngredient: () => void;
};

type Row = {
  emoji: string;
  label: string;
  href: string;
  count: number;
  onNew: () => void;
};

/** The rail's "library" section: your reusable food + pantry, with quick-adds. */
export function LibraryRail({
  foodCount,
  ingredientCount,
  onNewFood,
  onNewIngredient,
}: Props) {
  const rows: Row[] = [
    { emoji: "📖", label: "Food", href: "/food", count: foodCount, onNew: onNewFood },
    {
      emoji: "🥕",
      label: "Ingredients",
      href: "/ingredients",
      count: ingredientCount,
      onNew: onNewIngredient,
    },
  ];

  return (
    <section>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        Library
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-lilac/40 text-base">
              {row.emoji}
            </span>
            <Link
              href={row.href}
              className="min-w-0 flex-1 truncate text-sm font-bold text-foreground transition hover:text-grape"
            >
              {row.label}
            </Link>
            <span className="flex-none text-sm font-semibold text-muted">
              {row.count}
            </span>
            <button
              type="button"
              onClick={row.onNew}
              aria-label={`New ${row.label.toLowerCase()}`}
              className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full border border-grape/30 text-grape-deep transition hover:bg-grape/10"
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
