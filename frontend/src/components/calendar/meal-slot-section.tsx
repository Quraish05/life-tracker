"use client";

import type { Dish } from "@/types/dish";
import type { MealLog } from "@/types/meal";
import { IconButton } from "@/components/ui/atoms/icon-button";
import { DishPicker } from "@/components/calendar/dish-picker";

type Props = {
  label: string;
  emoji: string;
  meals: MealLog[];
  dishes: Dish[];
  onAdd: (dishId: number, note: string) => void;
  onCreateNew: () => void;
  onDelete: (meal: MealLog) => void;
  /** Optional badge (e.g. snacks "1/2"). */
  badge?: string;
  /** When true, the slot is full and the add control is hidden. */
  atMax?: boolean;
};

export function MealSlotSection({
  label,
  emoji,
  meals,
  dishes,
  onAdd,
  onCreateNew,
  onDelete,
  badge,
  atMax = false,
}: Props) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <h3 className="font-bold text-ink">{label}</h3>
        {badge && (
          <span className="rounded-full bg-lilac/40 px-2 py-0.5 text-xs font-semibold text-grape-deep">
            {badge}
          </span>
        )}
      </div>

      {meals.length === 0 ? (
        <p className="mb-2 text-sm text-ink-soft/70 italic">Nothing logged.</p>
      ) : (
        <ul className="mb-2 space-y-1.5">
          {meals.map((meal) => (
            <li
              key={meal.id}
              className="group flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-ink">{meal.dish_name}</span>
                {meal.note && (
                  <span className="ml-2 text-sm text-ink-soft">· {meal.note}</span>
                )}
              </div>
              <IconButton
                onClick={() => onDelete(meal)}
                aria-label={`Remove ${meal.dish_name}`}
                tone="danger"
              >
                ✕
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {!atMax && (
        <DishPicker dishes={dishes} onAdd={onAdd} onCreateNew={onCreateNew} />
      )}
    </section>
  );
}
