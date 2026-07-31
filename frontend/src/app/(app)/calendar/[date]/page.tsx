"use client";

import { use, useState } from "react";
import Link from "next/link";

import { useFoods } from "@/lib/use-food";
import { useCreateMeal, useDeleteMeal, useMeals } from "@/lib/use-meals";
import {
  useCreateExercise,
  useDeleteExercise,
  useExercises,
} from "@/lib/use-exercises";
import { useNotes } from "@/lib/use-notes";
import { useReminders } from "@/lib/use-reminders";
import type { MealSlot } from "@/lib/validations/meal";
import {
  MAIN_SLOTS,
  MAX_SNACKS,
  SNACK_SLOT,
  formatDayLong,
  toISODate,
} from "@/components/calendar/_lib";
import { MealSlotSection } from "@/components/calendar/meal-slot-section";
import { DayExercises } from "@/components/calendar/day-exercises";
import { DayJournal } from "@/components/calendar/day-journal";
import { DayReminders } from "@/components/calendar/day-reminders";
import { DaySummary } from "@/components/calendar/day-summary";
import { FoodEditor } from "@/components/food/food-editor";
import { AccentText } from "@/components/ui/atoms/accent-text";

export default function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);

  const { data: meals = [], isLoading } = useMeals(date, date);
  const { data: foods = [] } = useFoods();
  const { data: exercises = [] } = useExercises(date, date);
  const { data: notes = [] } = useNotes();
  const { data: reminders = [] } = useReminders();
  const createMeal = useCreateMeal();
  const deleteMeal = useDeleteMeal();
  const createExercise = useCreateExercise();
  const deleteExercise = useDeleteExercise();

  // Other activities that belong to this day (read-only summary).
  const journalEntries = notes.filter(
    (n) => n.kind === "journal" && n.entry_date === date,
  );
  const dayReminders = reminders
    .filter((r) => toISODate(new Date(r.remind_at)) === date)
    .sort((a, b) => a.remind_at.localeCompare(b.remind_at));

  // When set, the food editor is open to create a food for this slot; on save
  // the new food is logged straight into that slot.
  const [newFoodForSlot, setNewFoodForSlot] = useState<MealSlot | null>(null);

  function slotMeals(slot: MealSlot) {
    return meals.filter((m) => m.slot === slot);
  }

  function addMeal(slot: MealSlot, foodId: number, note: string) {
    createMeal.mutate({
      log_date: date,
      slot,
      food_id: foodId,
      note: note || undefined,
    });
  }

  const snackMeals = slotMeals("snack");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      <Link
        href="/calendar"
        className="text-sm font-semibold text-muted transition hover:text-grape"
      >
        ← Calendar
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground tablet:text-3xl">
        {formatDayLong(date)}
      </h1>
      <p className="mt-1 text-base text-muted">
        What you <AccentText>ate</AccentText> and how you moved.
      </p>

      <div className="mt-6">
        <DaySummary date={date} />
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-6 space-y-4">
          {MAIN_SLOTS.map((slot) => (
            <MealSlotSection
              key={slot.key}
              label={slot.label}
              emoji={slot.emoji}
              meals={slotMeals(slot.key)}
              foods={foods}
              onAdd={(foodId, note) => addMeal(slot.key, foodId, note)}
              onCreateNew={() => setNewFoodForSlot(slot.key)}
              onDelete={(m) => deleteMeal.mutate(m.id)}
            />
          ))}

          <MealSlotSection
            label="Snacks"
            emoji={SNACK_SLOT.emoji}
            meals={snackMeals}
            foods={foods}
            onAdd={(foodId, note) => addMeal("snack", foodId, note)}
            onCreateNew={() => setNewFoodForSlot("snack")}
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

          {(journalEntries.length > 0 || dayReminders.length > 0) && (
            <div className="space-y-4 border-t border-border/40 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted/70">
                Also on this day
              </p>
              <DayJournal entries={journalEntries} />
              <DayReminders reminders={dayReminders} />
            </div>
          )}
        </div>
      )}

      {newFoodForSlot && (
        <FoodEditor
          food={null}
          onClose={() => setNewFoodForSlot(null)}
          onSaved={(food) => {
            addMeal(newFoodForSlot, food.id, "");
            setNewFoodForSlot(null);
          }}
        />
      )}
    </div>
  );
}
