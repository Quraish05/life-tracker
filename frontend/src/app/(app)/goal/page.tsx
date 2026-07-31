"use client";

import { Controller, useForm } from "react-hook-form";

import { useHealthGoal, useUpsertHealthGoal } from "@/lib/queries/use-health-goal";
import type { HealthGoal } from "@/types/health-goal";
import {
  activityLevels,
  goalTypes,
  type ActivityLevel,
  type GoalType,
  type HealthGoalInput,
} from "@/lib/validations/health-goal";
import { optionPillClass } from "@/components/notes/_lib";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Button } from "@/components/ui/atoms/button";
import { FormError } from "@/components/ui/atoms/form-error";
import { Label } from "@/components/ui/atoms/label";
import { FormField } from "@/components/ui/molecules/form-field";
import { PageHeader } from "@/components/ui/molecules/page-header";

type GoalFormValues = {
  goal_type: GoalType;
  current_weight_kg: string;
  target_weight_kg: string;
  height_cm: string;
  activity_level: ActivityLevel | "";
  timeframe_weeks: string;
  note: string;
};

const numToStr = (n: number | null | undefined) => (n == null ? "" : String(n));
const strToNum = (s: string): number | null => {
  const t = s.trim();
  return t === "" ? null : Number(t);
};

export default function GoalPage() {
  const { data: goal, isLoading } = useHealthGoal();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Health goal"
        title={
          <>
            What are you <AccentText>working toward?</AccentText>
          </>
        }
        subtitle="Set your goal so the daily summary can tell you if you're on track."
      />
      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <GoalForm initial={goal ?? null} />
      )}
    </div>
  );
}

function GoalForm({ initial }: { initial: HealthGoal | null }) {
  const upsert = useUpsertHealthGoal();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<GoalFormValues>({
    defaultValues: {
      goal_type: initial?.goal_type ?? "maintain",
      current_weight_kg: numToStr(initial?.current_weight_kg),
      target_weight_kg: numToStr(initial?.target_weight_kg),
      height_cm: numToStr(initial?.height_cm),
      activity_level: initial?.activity_level ?? "",
      timeframe_weeks: numToStr(initial?.timeframe_weeks),
      note: initial?.note ?? "",
    },
  });

  async function onSubmit(values: GoalFormValues) {
    const timeframe = strToNum(values.timeframe_weeks);
    const input: HealthGoalInput = {
      goal_type: values.goal_type,
      current_weight_kg: strToNum(values.current_weight_kg),
      target_weight_kg: strToNum(values.target_weight_kg),
      height_cm: strToNum(values.height_cm),
      activity_level: values.activity_level || null,
      timeframe_weeks: timeframe == null ? null : Math.round(timeframe),
      note: values.note.trim() || null,
    };
    try {
      const saved = await upsert.mutateAsync(input);
      // Re-seed the form as pristine with the saved values.
      reset({
        goal_type: saved.goal_type,
        current_weight_kg: numToStr(saved.current_weight_kg),
        target_weight_kg: numToStr(saved.target_weight_kg),
        height_cm: numToStr(saved.height_cm),
        activity_level: saved.activity_level ?? "",
        timeframe_weeks: numToStr(saved.timeframe_weeks),
        note: saved.note ?? "",
      });
    } catch (err) {
      setError("root", {
        message:
          err instanceof Error
            ? err.message
            : "Couldn't save. Please try again.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FormError message={errors.root?.message} />

      {/* Goal type */}
      <div className="space-y-1.5">
        <Label>Goal</Label>
        <Controller
          control={control}
          name="goal_type"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {goalTypes.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => field.onChange(opt.key)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${optionPillClass(
                    field.value === opt.key,
                  )}`}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Weights + height */}
      <div className="grid gap-4 tablet:grid-cols-3">
        <FormField
          label="Current weight (kg)"
          id="current_weight_kg"
          type="number"
          step="0.1"
          placeholder="e.g. 70"
          {...register("current_weight_kg")}
        />
        <FormField
          label="Target weight (kg)"
          id="target_weight_kg"
          type="number"
          step="0.1"
          placeholder="e.g. 66"
          {...register("target_weight_kg")}
        />
        <FormField
          label="Height (cm)"
          id="height_cm"
          type="number"
          step="0.1"
          placeholder="e.g. 175"
          {...register("height_cm")}
        />
      </div>

      {/* Activity + timeframe */}
      <div className="grid gap-4 tablet:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="activity_level">Activity level</Label>
          <select
            id="activity_level"
            {...register("activity_level")}
            className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm text-foreground transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring"
          >
            <option value="">Not sure</option>
            {activityLevels.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <FormField
          label="Timeframe (weeks)"
          id="timeframe_weeks"
          type="number"
          step="1"
          placeholder="e.g. 12"
          {...register("timeframe_weeks")}
        />
      </div>

      {/* Note */}
      <FormField
        label="Note (optional)"
        id="note"
        placeholder="e.g. summer cut, high-protein"
        {...register("note")}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save goal"}
        </Button>
        {isSubmitSuccessful && !upsert.isPending && (
          <span className="text-sm font-semibold text-grape">Saved ✓</span>
        )}
      </div>
    </form>
  );
}
