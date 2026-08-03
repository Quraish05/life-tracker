"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import type { FrequentFood } from "@/types/food";
import type { MealSlot } from "@/lib/validations/meal";
import {
  frequentFoodKey,
  useFoods,
  useFrequentFoods,
} from "@/lib/queries/use-food";
import { useIngredients } from "@/lib/queries/use-ingredients";
import {
  useCreateMeal,
  useDeleteMeal,
  useMeals,
} from "@/lib/queries/use-meals";
import { useDeleteExercise, useExercises } from "@/lib/queries/use-exercises";
import { todayISO } from "@/components/calendar/_lib";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { FoodEditor } from "@/components/food/food-editor";
import { IngredientEditor } from "@/components/ingredients/ingredient-editor";
import { EntryCards, type EntryKind } from "@/components/log/entry-cards";
import { MealSlots } from "@/components/log/meal-slots";
import { MovementList } from "@/components/log/movement-list";
import { OneTapAgain } from "@/components/log/one-tap-again";
import { LibraryRail } from "@/components/log/library-rail";
import { LogMealModal } from "@/components/log/log-meal-modal";
import { LogExerciseModal } from "@/components/log/log-exercise-modal";
import { DaySummaryEditor } from "@/components/insights/day-summary-editor";
import { pickerLabel, shiftISODate } from "@/components/log/_lib";

/** YYYY-MM-DD, the shape calendar/[date] redirects with. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The active modal, if any. "meal" carries the slot it opened from. */
type ModalState =
  | null
  | { kind: "meal"; slot: MealSlot }
  | { kind: "exercise" }
  | { kind: "food" }
  | { kind: "ingredient" };

const SECTION_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-muted";

function LogPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  // Preselect the day from ?date= (how calendar/[date] hands off), else today.
  const [date, setDate] = useState<string>(() => {
    const q = searchParams.get("date");
    return q && ISO_DATE.test(q) ? q : todayISO();
  });
  const [modal, setModal] = useState<ModalState>(null);

  const { data: meals = [] } = useMeals(date, date);
  const { data: exercises = [] } = useExercises(date, date);
  const { data: foods = [] } = useFoods();
  const { data: ingredients = [] } = useIngredients();
  const { data: frequent = [] } = useFrequentFoods();

  const createMeal = useCreateMeal();
  const deleteMeal = useDeleteMeal();
  const deleteExercise = useDeleteExercise();

  const frequentById = useMemo(
    () => new Map(frequent.map((f) => [f.food_id, f])),
    [frequent],
  );

  /** The "one tap again" rail derives from meal logs — refresh it after a change. */
  function refreshFrequent() {
    queryClient.invalidateQueries({ queryKey: frequentFoodKey });
  }

  function onEntryCard(kind: EntryKind) {
    if (kind === "meal") setModal({ kind: "meal", slot: "breakfast" });
    else if (kind === "food") setModal({ kind: "food" });
    else if (kind === "ingredient") setModal({ kind: "ingredient" });
    else setModal({ kind: "exercise" });
  }

  function logAgain(food: FrequentFood) {
    createMeal.mutate(
      { log_date: date, slot: food.top_slot, food_id: food.food_id },
      { onSuccess: refreshFrequent },
    );
  }

  function removeMeal(id: number) {
    deleteMeal.mutate(id, { onSuccess: refreshFrequent });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      {/* <div className="grid gap-8 laptop:grid-cols-[minmax(0,1fr)_300px] laptop:items-start"> */}
      {/* Main column */}
      <div className="min-w-0">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={SECTION_LABEL}>Log an entry</p>
            <h1 className="mt-1.5 text-3xl font-normal tracking-tight text-foreground">
              Everything goes in <AccentText tone="grape">one place</AccentText>
            </h1>
          </div>
          <DayPicker date={date} onChange={setDate} />
        </header>

        <div className="mt-6">
          <EntryCards onSelect={onEntryCard} />
        </div>

        <hr className="my-7 border-border/60" />

        <section>
          <p className={SECTION_LABEL}>Meals</p>
          <div className="mt-3">
            <MealSlots
              meals={meals}
              onAdd={(slot) => setModal({ kind: "meal", slot })}
              onRemove={removeMeal}
            />
          </div>
        </section>

        <section className="mt-7">
          <p className={SECTION_LABEL}>Movement</p>
          <div className="mt-3">
            <MovementList
              exercises={exercises}
              onAdd={() => setModal({ kind: "exercise" })}
              onRemove={(id) => deleteExercise.mutate(id)}
            />
          </div>
        </section>

        <section className="mt-7">
          <p className={SECTION_LABEL}>Day summary</p>
          <div className="mt-3">
            {/* Remount per day so the saved note loads for the selected date. */}
            <DaySummaryEditor key={date} date={date} />
          </div>
        </section>
      </div>

      {/* Right rail */}
      {/*   <aside className="space-y-7 laptop:sticky laptop:top-6">
          <OneTapAgain
            items={frequent}
            onLog={logAgain}
            isLogging={createMeal.isPending}
          />
          <LibraryRail
            foodCount={foods.length}
            ingredientCount={ingredients.length}
            onNewFood={() => setModal({ kind: "food" })}
            onNewIngredient={() => setModal({ kind: "ingredient" })}
          />
        </aside> */}
      {/* </div> */}

      {/* Modals */}
      {modal?.kind === "meal" && (
        <LogMealModal
          date={date}
          initialSlot={modal.slot}
          foods={foods}
          frequentById={frequentById}
          onClose={() => setModal(null)}
          onLogged={() => {
            refreshFrequent();
            setModal(null);
          }}
        />
      )}

      {modal?.kind === "exercise" && (
        <LogExerciseModal
          date={date}
          onClose={() => setModal(null)}
          onLogged={() => setModal(null)}
        />
      )}

      {modal?.kind === "food" && (
        <FoodEditor
          food={null}
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}

      {modal?.kind === "ingredient" && (
        <IngredientEditor
          ingredient={null}
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}
    </div>
  );
}

/** `useSearchParams` needs a Suspense boundary during static generation. */
export default function LogPage() {
  return (
    <Suspense fallback={null}>
      <LogPageContent />
    </Suspense>
  );
}

/** Compact prev / label / next day stepper. */
function DayPicker({
  date,
  onChange,
}: {
  date: string;
  onChange: (iso: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-1">
      <button
        type="button"
        onClick={() => onChange(shiftISODate(date, -1))}
        aria-label="Previous day"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-grape/10 hover:text-grape-deep"
      >
        ‹
      </button>
      <span className="min-w-[7.5rem] text-center text-sm font-bold text-foreground">
        {pickerLabel(date)}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftISODate(date, 1))}
        aria-label="Next day"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-grape/10 hover:text-grape-deep"
      >
        ›
      </button>
    </div>
  );
}
