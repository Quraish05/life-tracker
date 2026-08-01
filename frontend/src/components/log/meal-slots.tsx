"use client";

import type { MealLog } from "@/types/meal";
import type { MealSlot } from "@/lib/validations/meal";
import { cn } from "@/lib/utils";
import { LOG_SLOTS } from "@/components/log/_lib";

type Props = {
  meals: MealLog[];
  onAdd: (slot: MealSlot) => void;
  onRemove: (mealId: number) => void;
};

/** The MEALS block: one row per slot with its logged foods as removable chips. */
export function MealSlots({ meals, onAdd, onRemove }: Props) {
  return (
    <div className="space-y-3">
      {LOG_SLOTS.map((slot) => {
        const slotMeals = meals.filter((m) => m.slot === slot.key);
        return (
          <div
            key={slot.key}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-butter text-lg">
              {slot.emoji}
            </span>
            <span className="flex-none">
              <span className="block text-sm font-bold text-foreground">
                {slot.label}
              </span>
              <span className="block text-xs text-muted">{slot.when}</span>
            </span>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {slotMeals.length === 0 ? (
                <span className="text-sm italic text-muted/70">
                  Nothing logged yet
                </span>
              ) : (
                slotMeals.map((meal) => (
                  <span
                    key={meal.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-lilac/30 py-1 pl-3 pr-1.5 text-sm text-foreground"
                  >
                    <span className="font-semibold">{meal.food_name}</span>
                    {meal.note && (
                      <span className="text-muted">{meal.note}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(meal.id)}
                      aria-label={`Remove ${meal.food_name}`}
                      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs text-muted transition hover:bg-coral/20 hover:text-coral"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => onAdd(slot.key)}
              className={cn(
                "flex-none cursor-pointer rounded-full border border-grape/30 px-4 py-1.5 text-sm font-semibold text-grape-deep transition hover:bg-grape/10",
              )}
            >
              + Add
            </button>
          </div>
        );
      })}
    </div>
  );
}
