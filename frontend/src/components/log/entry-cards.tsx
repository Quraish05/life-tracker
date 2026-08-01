"use client";

import { cn } from "@/lib/utils";

/** The kinds of thing you can start logging from the hub's quick actions. */
export type EntryKind = "meal" | "food" | "ingredient" | "exercise";

const CARDS: {
  kind: EntryKind;
  emoji: string;
  title: string;
  subtitle: string;
  tile: string;
}[] = [
  { kind: "meal", emoji: "🍽️", title: "Meal", subtitle: "Food into a slot", tile: "bg-butter" },
  { kind: "food", emoji: "📖", title: "Food", subtitle: "Name + ingredients", tile: "bg-mint" },
  { kind: "ingredient", emoji: "🥕", title: "Ingredient", subtitle: "Into your pantry", tile: "bg-peach" },
  { kind: "exercise", emoji: "🏃", title: "Exercise", subtitle: "Movement for the day", tile: "bg-lilac" },
];

/** The four "start a new entry" cards at the top of the log hub. */
export function EntryCards({ onSelect }: { onSelect: (kind: EntryKind) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
      {CARDS.map((card) => (
        <button
          key={card.kind}
          type="button"
          onClick={() => onSelect(card.kind)}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left transition hover:border-grape/40 hover:bg-grape/5"
        >
          <span
            className={cn(
              "flex h-11 w-11 flex-none items-center justify-center rounded-xl text-xl",
              card.tile,
            )}
          >
            {card.emoji}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-foreground">
              {card.title}
            </span>
            <span className="block truncate text-xs text-muted">{card.subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
