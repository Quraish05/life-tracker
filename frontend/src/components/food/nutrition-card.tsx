import type { Nutrition } from "@/types/food";
import { cn } from "@/lib/utils";

/** The three macros, in display order, each with its own bar colour. */
const MACROS = [
  { key: "protein_g", label: "Protein", bar: "bg-grape" },
  { key: "carbs_g", label: "Carbs", bar: "bg-peach" },
  { key: "fat_g", label: "Fat", bar: "bg-coral" },
] as const;

/** True when a food carries any nutrition at all (else show the empty prompt). */
export function hasNutrition(n: Nutrition): boolean {
  return (
    n.calories != null ||
    n.protein_g != null ||
    n.carbs_g != null ||
    n.fat_g != null
  );
}

/**
 * The per-serving nutrition panel: a big kcal figure over three macro bars.
 * Bars are scaled against the largest macro so the mix reads at a glance (not
 * an absolute daily-value scale — a food card is about proportion, not RDA).
 */
export function NutritionCard({ nutrition }: { nutrition: Nutrition }) {
  const grams = MACROS.map((m) => nutrition[m.key] ?? 0);
  const max = Math.max(...grams, 1);

  return (
    <div className="rounded-2xl bg-foreground/[0.04] p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold leading-none tracking-tight text-foreground">
          {nutrition.calories ?? "—"}
        </span>
        <span className="text-sm text-muted">kcal per serving</span>
      </div>

      <div className="mt-4 space-y-3">
        {MACROS.map((m) => {
          const value = nutrition[m.key];
          const pct = value == null ? 0 : Math.max((value / max) * 100, 4);
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted">{m.label}</span>
                <span className="font-semibold text-foreground">
                  {value == null ? "—" : `${value} g`}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={cn("h-full rounded-full", m.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
