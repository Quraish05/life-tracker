"use client";

import type { ReactNode } from "react";

import type { FoodItem } from "@/types/food";
import { useFoodActivity } from "@/lib/queries/use-food";
import { useCreateMeal } from "@/lib/queries/use-meals";
import { today } from "@/components/notes/_lib";
import { Button } from "@/components/ui/atoms/button";
import { Chip } from "@/components/ui/atoms/chip";
import { MarkdownPreview } from "@/components/notes/markdown-preview";
import { capitalize } from "@/components/food/_lib";
import { NutritionCard, hasNutrition } from "@/components/food/nutrition-card";
import { RecentlyLogged } from "@/components/food/recently-logged";

type Props = {
  /** The food to read, or null when the library has no selection. */
  food: FoodItem | null;
  onEdit: (food: FoodItem) => void;
  onDelete: (food: FoodItem) => void;
};

/** An uppercase section heading with the reader's standard top spacing. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
      {children}
    </p>
  );
}

/** The empty aside shown when nothing in the library is selected. */
function NoSelection() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
      <span className="text-3xl">🍽️</span>
      <p className="mt-3 text-sm text-muted">
        Pick a food from the list to read it.
      </p>
    </div>
  );
}

/** Detail aside of the food library: the selected food, read in full. */
export function FoodReader({ food, onEdit, onDelete }: Props) {
  const activity = useFoodActivity(food?.id ?? null);
  const createMeal = useCreateMeal();

  if (!food) return <NoSelection />;

  // Capture the id so the logNow closure doesn't trip control-flow narrowing.
  const foodId = food.id;
  const { count: logged = 0, top_slot: topSlot = null, recent = [] } =
    activity.data ?? {};
  const ingredientCount = food.ingredients.length;

  // Subtitle mirrors the design: the food's habitual slot + how often it's been
  // logged, falling back to the ingredient count before it's ever been eaten.
  const subtitle =
    logged > 0
      ? `${topSlot ? capitalize(topSlot) : "Logged"} · logged ${logged}×`
      : `${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"}`;

  function logNow() {
    createMeal.mutate(
      { log_date: today(), slot: topSlot ?? "lunch", food_id: foodId },
      { onSuccess: () => activity.refetch() },
    );
  }

  const logLabel = createMeal.isPending
    ? "Logging…"
    : createMeal.isSuccess
      ? "Logged ✓"
      : "Log this now";

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {/* Header — emoji, name, and a one-line meta */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-foreground/5 text-xl">
          🍽️
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-foreground">
            {food.name}
          </p>
          <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>
        </div>
      </div>

      {/* Nutrition — the kcal + macro card, or a prompt to add it */}
      <div className="mt-4">
        {hasNutrition(food) ? (
          <NutritionCard nutrition={food} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-3 text-center">
            <p className="text-xs text-muted">
              No nutrition yet — open Edit and tap{" "}
              <span className="font-semibold text-grape-deep">✨ Ask AI</span>.
            </p>
          </div>
        )}
      </div>

      {/* Ingredients — as chips */}
      <SectionLabel>Ingredients</SectionLabel>
      {ingredientCount === 0 ? (
        <p className="mt-2 text-sm italic text-muted/70">
          No ingredients listed.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {food.ingredients.map((ing, i) => (
            <Chip key={i} tone="soft" size="md">
              {ing.name}
              {ing.amount && (
                <span className="font-normal text-grape-deep/70">
                  {ing.amount}
                </span>
              )}
            </Chip>
          ))}
        </div>
      )}

      {/* Recently logged — the last few times this food was eaten */}
      {recent.length > 0 && (
        <>
          <SectionLabel>Recently logged</SectionLabel>
          <RecentlyLogged logs={recent} />
        </>
      )}

      {/* Recipe — rendered markdown, only when there is one */}
      {food.recipe_md && (
        <>
          <SectionLabel>Recipe</SectionLabel>
          <div className="mt-2 text-sm">
            <MarkdownPreview>{food.recipe_md}</MarkdownPreview>
          </div>
        </>
      )}

      {/* Actions — log it now, edit, delete */}
      <div className="mt-6 flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={logNow}
          disabled={createMeal.isPending}
        >
          {logLabel}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onEdit(food)}>
          Edit
        </Button>
      </div>
      <button
        type="button"
        onClick={() => onDelete(food)}
        className="mt-3 w-full text-center text-xs font-semibold text-coral/80 transition hover:text-coral"
      >
        Delete food
      </button>

      {/* AI transparency footnote */}
      {hasNutrition(food) && (
        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          ✨ Macros estimated by AI when you saved this food — edit any value to
          correct it.
        </p>
      )}
    </div>
  );
}
