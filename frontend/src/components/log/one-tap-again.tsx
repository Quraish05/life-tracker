"use client";

import type { FrequentFood } from "@/types/food";
import { slotLabel } from "@/components/log/_lib";

type Props = {
  items: FrequentFood[];
  /** Log this food straight into its usual slot for the active day. */
  onLog: (food: FrequentFood) => void;
  /** Whether a one-tap log is currently in flight (disables the buttons). */
  isLogging?: boolean;
};

/** The rail of most-logged foods — tap one to re-log it into its usual slot. */
export function OneTapAgain({ items, onLog, isLogging = false }: Props) {
  return (
    <section>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        One tap again
      </p>
      <p className="mt-1 text-xs text-muted">
        Tap to log straight into its usual slot.
      </p>

      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-3 py-4 text-xs text-muted">
          Log a few meals and your regulars show up here for one-tap repeats.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((food) => (
            <li key={food.food_id}>
              <button
                type="button"
                onClick={() => onLog(food)}
                disabled={isLogging}
                title={`Log ${food.name} into ${slotLabel(food.top_slot)}`}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 text-left transition hover:border-grape/40 hover:bg-grape/5 disabled:pointer-events-none disabled:opacity-60"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-lilac/40 text-base">
                  🍽️
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {food.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {slotLabel(food.top_slot)} · {food.count}{" "}
                    {food.count === 1 ? "log" : "logs"}
                  </span>
                </span>
                <span aria-hidden className="flex-none text-sm text-grape">
                  +
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
