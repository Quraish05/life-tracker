import type { MealLog } from "@/types/meal";
import type { FoodItem } from "@/types/food";
import type { HealthGoal } from "@/types/health-goal";
import { goalTypes, type GoalType } from "@/lib/validations/health-goal";
import { parseISODate, toISODate } from "@/components/calendar/_lib";

/** The emoji for a goal type (from the shared goalTypes source). */
export function goalEmoji(type: GoalType): string {
  return goalTypes.find((g) => g.key === type)?.emoji ?? "🎯";
}

/**
 * A human title for the focus card, derived from the goal type + target weight.
 * We have no separate "goal name" field, so this reads the structured goal:
 * e.g. "Lose weight to 74.4 kg", "Maintain weight", "General fitness".
 */
export function deriveGoalTitle(goal: HealthGoal): string {
  const label = goalTypes.find((g) => g.key === goal.goal_type)?.label ?? "Your goal";
  const target = goal.target_weight_kg;
  if (target != null && (goal.goal_type === "lose_weight" || goal.goal_type === "gain_weight")) {
    return `${label} to ${target} kg`;
  }
  return label;
}

/**
 * Time-based progress from the goal's start (`created_at`) over its `timeframe_weeks`.
 * Honest: we have no weight history, so the bar tracks elapsed time, not kilos.
 * Returns null when there's no timeframe to measure against.
 */
export function dayOfN(
  goal: HealthGoal,
  todayIso: string,
): { day: number; total: number; pct: number } | null {
  if (!goal.timeframe_weeks) return null;
  const total = goal.timeframe_weeks * 7;
  const start = parseISODate(toISODate(new Date(goal.created_at)));
  const today = parseISODate(todayIso);
  const elapsed = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  const day = Math.min(Math.max(elapsed + 1, 1), total);
  return { day, total, pct: Math.round((day / total) * 100) };
}

/** Remaining weight to the target, with direction, or null if not enough data. */
export function weightRemaining(
  goal: HealthGoal,
): { kg: number; verb: "to lose" | "to gain" } | null {
  const { current_weight_kg: cur, target_weight_kg: tgt } = goal;
  if (cur == null || tgt == null) return null;
  const kg = Math.round(Math.abs(cur - tgt) * 10) / 10;
  return { kg, verb: cur >= tgt ? "to lose" : "to gain" };
}

/** Index foods by id, so a meal's macros can be looked up in one pass. */
export function foodMap(foods: FoodItem[]): Map<number, FoodItem> {
  return new Map(foods.map((f) => [f.id, f]));
}

/** Macros for one meal via its food (zeros when the food or its macros are missing). */
export function mealMacros(
  meal: MealLog,
  foods: Map<number, FoodItem>,
): { calories: number; protein: number } {
  const food = meal.food_id != null ? foods.get(meal.food_id) : undefined;
  return { calories: food?.calories ?? 0, protein: food?.protein_g ?? 0 };
}

/** Sum calories + protein across a day's meals. */
export function tallyMeals(
  meals: MealLog[],
  foods: Map<number, FoodItem>,
): { calories: number; protein: number } {
  return meals.reduce(
    (acc, m) => {
      const { calories, protein } = mealMacros(m, foods);
      return { calories: acc.calories + calories, protein: acc.protein + protein };
    },
    { calories: 0, protein: 0 },
  );
}

/** The last `n` calendar days as ISO strings, oldest → newest, ending today. */
export function lastNDays(n: number, todayIso: string): string[] {
  const today = parseISODate(todayIso);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return toISODate(d);
  });
}
