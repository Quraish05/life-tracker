"use client";

import { useEffect, useMemo, useState } from "react";

import type { FoodItem, FrequentFood } from "@/types/food";
import type { MealSlot } from "@/lib/validations/meal";
import { MEAL_NOTE_MAX } from "@/lib/validations/meal";
import { useCreateMeal } from "@/lib/queries/use-meals";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/atoms/button";
import {
  ModalDialog,
  ModalHeader,
  ModalOverlay,
} from "@/components/ui/molecules/modal";
import { LOG_SLOTS, savesToLabel, slotLabel } from "@/components/log/_lib";

type Props = {
  /** The day meals are saved to (YYYY-MM-DD). */
  date: string;
  /** Slot to preselect (e.g. the "+ Add" that opened this). */
  initialSlot: MealSlot;
  foods: FoodItem[];
  /** Log counts keyed by food id, for the "· 12 logs" subtitles. */
  frequentById: Map<number, FrequentFood>;
  onClose: () => void;
  /** Called after a meal is logged (the parent refreshes + closes). */
  onLogged: () => void;
};

/** "Log a meal": pick a slot, search a food from the library, add a portion note. */
export function LogMealModal({
  date,
  initialSlot,
  foods,
  frequentById,
  onClose,
  onLogged,
}: Props) {
  const createMeal = useCreateMeal();
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [query, setQuery] = useState("");
  const [foodId, setFoodId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  // Close on Escape for a native modal feel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? foods.filter((f) => f.name.toLowerCase().includes(q)) : foods;
  }, [foods, query]);

  async function submit() {
    if (foodId == null) return;
    await createMeal.mutateAsync({
      log_date: date,
      slot,
      food_id: foodId,
      note: note.trim() || undefined,
    });
    onLogged();
  }

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto py-10">
      <ModalDialog className="max-w-xl" aria-label="Log a meal">
        <ModalHeader onClose={onClose}>
          <span className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Meals
            </span>
            Log a meal
          </span>
        </ModalHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Slot */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Slot
            </p>
            <div className="grid grid-cols-4 gap-2">
              {LOG_SLOTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSlot(s.key)}
                  aria-pressed={slot === s.key}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition",
                    slot === s.key
                      ? "border-grape bg-grape/10 text-foreground"
                      : "border-border text-foreground/70 hover:bg-grape/8",
                  )}
                >
                  <span className="text-lg">{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Food
            </p>
            {foods.length === 0 ? (
              <p className="rounded-xl border border-border bg-background/60 px-3 py-3 text-sm text-muted">
                No foods in your library yet — create one from the “Food” card first.
              </p>
            ) : (
              <>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search your ${foods.length} food ${
                    foods.length === 1 ? "item" : "items"
                  }…`}
                  aria-label="Search foods"
                  className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition focus:border-grape focus:outline-none focus:ring-4 focus:ring-ring"
                />
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
                  {results.map((food) => {
                    const freq = frequentById.get(food.id);
                    const selected = foodId === food.id;
                    return (
                      <li key={food.id}>
                        <button
                          type="button"
                          onClick={() => setFoodId(food.id)}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                            selected
                              ? "border-grape/40 bg-grape/10"
                              : "border-transparent hover:bg-grape/8",
                          )}
                        >
                          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-lilac/40 text-base">
                            🍽️
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {food.name}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {freq
                                ? `${slotLabel(freq.top_slot)} · ${freq.count} ${
                                    freq.count === 1 ? "log" : "logs"
                                  }`
                                : "Not logged yet"}
                            </span>
                          </span>
                          {selected && (
                            <span aria-hidden className="text-grape">
                              ✓
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {results.length === 0 && (
                    <li className="px-3 py-3 text-sm text-muted">
                      No food matches “{query}”.
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>

          {/* Note */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Portion or note · optional
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="1 bowl, extra berries…"
              maxLength={MEAL_NOTE_MAX}
              aria-label="Portion or note"
              className="w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition focus:border-grape focus:outline-none focus:ring-4 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <span className="text-xs text-muted">{savesToLabel(date)}</span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={foodId == null || createMeal.isPending}
            >
              {createMeal.isPending ? "Logging…" : "Log meal"}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </ModalOverlay>
  );
}
