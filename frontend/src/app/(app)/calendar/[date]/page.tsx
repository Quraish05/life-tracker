"use client";

import { use, useState } from "react";
import Link from "next/link";

import { useDishes } from "@/lib/use-dishes";
import { useCreateMeal, useDeleteMeal, useMeals } from "@/lib/use-meals";
import {
  useCreateExercise,
  useDeleteExercise,
  useExercises,
} from "@/lib/use-exercises";
import type { MealSlot } from "@/lib/validations/meal";
import {
  MAIN_SLOTS,
  MAX_SNACKS,
  SNACK_SLOT,
  formatDayLong,
} from "@/components/calendar/_lib";
import { MealSlotSection } from "@/components/calendar/meal-slot-section";
import { DayExercises } from "@/components/calendar/day-exercises";
import { DishEditor } from "@/components/dishes/dish-editor";
import { AccentText } from "@/components/ui/atoms/accent-text";

export default function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);

  const { data: meals = [], isLoading } = useMeals(date, date);
  const { data: dishes = [] } = useDishes();
  const { data: exercises = [] } = useExercises(date, date);
  const createMeal = useCreateMeal();
  const deleteMeal = useDeleteMeal();
  const createExercise = useCreateExercise();
  const deleteExercise = useDeleteExercise();

  // When set, the dish editor is open to create a dish for this slot; on save
  // the new dish is logged straight into that slot.
  const [newDishForSlot, setNewDishForSlot] = useState<MealSlot | null>(null);

  function slotMeals(slot: MealSlot) {
    return meals.filter((m) => m.slot === slot);
  }

  function addMeal(slot: MealSlot, dishId: number, note: string) {
    createMeal.mutate({
      log_date: date,
      slot,
      dish_id: dishId,
      note: note || undefined,
    });
  }

  const snackMeals = slotMeals("snack");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 tablet:px-6 tablet:py-10">
      <Link
        href="/calendar"
        className="text-sm font-semibold text-ink-soft transition hover:text-grape"
      >
        ← Calendar
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink tablet:text-3xl">
        {formatDayLong(date)}
      </h1>
      <p className="mt-1 text-base text-ink-soft">
        What you <AccentText>ate</AccentText> and how you moved.
      </p>

      {isLoading ? (
        <p className="mt-6 text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-6 space-y-4">
          {MAIN_SLOTS.map((slot) => (
            <MealSlotSection
              key={slot.key}
              label={slot.label}
              emoji={slot.emoji}
              meals={slotMeals(slot.key)}
              dishes={dishes}
              onAdd={(dishId, note) => addMeal(slot.key, dishId, note)}
              onCreateNew={() => setNewDishForSlot(slot.key)}
              onDelete={(m) => deleteMeal.mutate(m.id)}
            />
          ))}

          <MealSlotSection
            label="Snacks"
            emoji={SNACK_SLOT.emoji}
            meals={snackMeals}
            dishes={dishes}
            onAdd={(dishId, note) => addMeal("snack", dishId, note)}
            onCreateNew={() => setNewDishForSlot("snack")}
            onDelete={(m) => deleteMeal.mutate(m.id)}
            badge={`${snackMeals.length}/${MAX_SNACKS}`}
            atMax={snackMeals.length >= MAX_SNACKS}
          />

          <DayExercises
            exercises={exercises}
            onAdd={(name, note) =>
              createExercise.mutate({
                log_date: date,
                name,
                note: note || undefined,
              })
            }
            onDelete={(ex) => deleteExercise.mutate(ex.id)}
          />
        </div>
      )}

      {newDishForSlot && (
        <DishEditor
          dish={null}
          onClose={() => setNewDishForSlot(null)}
          onSaved={(dish) => {
            addMeal(newDishForSlot, dish.id, "");
            setNewDishForSlot(null);
          }}
        />
      )}
    </div>
  );
}
