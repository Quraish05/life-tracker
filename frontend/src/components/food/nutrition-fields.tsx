"use client";

import {
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";

import { isQuotaError } from "@/lib/api";
import { useEstimateNutrition } from "@/lib/queries/use-food";
import { useAiQuota } from "@/lib/use-ai-quota";
import type { FoodItemInput } from "@/lib/validations/food";
import { AiLimitNotice, AiQuotaHint } from "@/components/ai/ai-quota";
import { Button } from "@/components/ui/atoms/button";
import { FormField } from "@/components/ui/molecules/form-field";
import { Label } from "@/components/ui/atoms/label";

type Props = {
  control: Control<FoodItemInput>;
  register: UseFormRegister<FoodItemInput>;
  errors: FieldErrors<FoodItemInput>;
  setValue: UseFormSetValue<FoodItemInput>;
};

const MACRO_FIELDS = [
  { name: "calories", label: "Calories", unit: "kcal" },
  { name: "protein_g", label: "Protein", unit: "g" },
  { name: "carbs_g", label: "Carbs", unit: "g" },
  { name: "fat_g", label: "Fat", unit: "g" },
] as const;

/**
 * The editor's per-serving nutrition section: an "✨ Ask AI" estimator over four
 * editable macro fields. The AI proposes numbers from the name + ingredients
 * you've typed; they drop straight into the fields so you can correct anything
 * before saving — the model proposes, you dispose.
 */
export function NutritionFields({ control, register, errors, setValue }: Props) {
  const name = useWatch({ control, name: "name" });
  const ingredients = useWatch({ control, name: "ingredients" });

  const estimate = useEstimateNutrition();
  const quota = useAiQuota();

  const enoughContent = (name ?? "").trim().length > 0;
  const outOfCredits = quota.exhausted || isQuotaError(estimate.error);

  function askAi() {
    estimate.mutate(
      {
        name: (name ?? "").trim(),
        ingredients: (ingredients ?? []).filter((i) => i.name.trim().length > 0),
      },
      {
        onSuccess: (data) => {
          for (const { name } of MACRO_FIELDS) {
            setValue(name, data[name], { shouldDirty: true });
          }
          quota.refresh();
        },
      },
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label>Nutrition</Label>
        <span className="text-xs text-muted">per serving</span>
        <div className="ml-auto flex items-center gap-2">
          {!outOfCredits && <AiQuotaHint />}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={askAi}
            disabled={!enoughContent || estimate.isPending || outOfCredits}
            title={
              outOfCredits
                ? "You've used all your free AI actions."
                : enoughContent
                  ? "Estimate calories & macros from the name and ingredients"
                  : "Add a name first."
            }
          >
            {estimate.isPending ? "✨ Estimating…" : "✨ Ask AI"}
          </Button>
        </div>
      </div>

      {outOfCredits ? (
        <AiLimitNotice />
      ) : (
        estimate.isError && (
          <p className="text-xs text-coral">
            {estimate.error.message || "Couldn't estimate. Please try again."}
          </p>
        )
      )}

      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
        {MACRO_FIELDS.map((f) => (
          <FormField
            key={f.name}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder="—"
            label={`${f.label} (${f.unit})`}
            id={f.name}
            error={errors[f.name]?.message}
            {...register(f.name, {
              setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
            })}
          />
        ))}
      </div>

      {estimate.isSuccess && (
        <p className="text-xs text-muted">
          ✨ Estimated by AI — edit any value to correct it.
        </p>
      )}
    </div>
  );
}
