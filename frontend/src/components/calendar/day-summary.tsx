"use client";

import { isQuotaError } from "@/lib/api";
import type { Assessment } from "@/types/insights";
import { useAiQuota } from "@/lib/use-ai-quota";
import {
  useDailySummary,
  useDaySummaryRecord,
  useSaveSummary,
} from "@/lib/queries/use-insights";
import { AiLimitNotice, AiQuotaHint } from "@/components/ai/ai-quota";
import { Button } from "@/components/ui/atoms/button";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";

export const ASSESSMENT_META: Record<
  Assessment,
  { label: string; tone: "success" | "danger" | "muted" }
> = {
  on_track: { label: "✓ On track", tone: "success" },
  off_track: { label: "⚠️ Off track", tone: "danger" },
  no_data: { label: "No data", tone: "muted" },
};

/**
 * On-demand AI summary of the day's calories vs the goal. Generating is
 * ephemeral; a "Save to progress" button persists the snapshot. On open, any
 * previously-saved summary for the day loads (no AI cost).
 */
export function DaySummary({ date }: { date: string }) {
  const { data: saved } = useDaySummaryRecord(date);
  const generate = useDailySummary();
  const save = useSaveSummary();
  const quota = useAiQuota();

  const draft = generate.data?.summary;
  // Show the freshly-generated draft if there is one, else the saved record.
  const showing = draft ?? saved ?? null;
  const model = draft ? generate.data?.model : saved?.model;
  const isUnsavedDraft = Boolean(draft) && !save.isSuccess;
  const outOfCredits = quota.exhausted || isQuotaError(generate.error);

  function handleGenerate() {
    save.reset();
    // Refresh the quota on success so the counter reflects the credit spent.
    // (A day with nothing logged returns a no_data summary the server doesn't
    // charge for — the refresh just re-reads the unchanged count, so it's safe.)
    generate.mutate(date, { onSuccess: () => quota.refresh() });
  }

  function handleSave() {
    if (!draft || !generate.data) return;
    save.mutate({
      summary_date: date,
      calories_in: draft.calories_in,
      calories_out: draft.calories_out,
      target_calories: draft.target_calories,
      assessment: draft.assessment,
      headline: draft.headline,
      tip: draft.tip,
      model: generate.data.model,
    });
  }

  return (
    <Card tone="soft" padding="md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="font-bold text-foreground">AI day summary</h3>
          {!outOfCredits && <AiQuotaHint />}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            disabled={generate.isPending || outOfCredits}
            title={
              outOfCredits
                ? "You've used all your free AI actions."
                : undefined
            }
          >
            {generate.isPending
              ? "Summarizing…"
              : saved || draft
                ? "Re-summarize"
                : "Summarize my day"}
          </Button>
          {isUnsavedDraft && (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={save.isPending}
            >
              {save.isPending ? "Saving…" : "Save to progress"}
            </Button>
          )}
        </div>
      </div>

      {outOfCredits ? (
        <AiLimitNotice className="mt-3" />
      ) : (
        (generate.isError || save.isError) && (
          <p className="mt-3 text-sm text-coral">
            {(generate.error ?? save.error)?.message ||
              "Something went wrong. Please try again."}
          </p>
        )
      )}

      {showing && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={ASSESSMENT_META[showing.assessment].tone}>
              {ASSESSMENT_META[showing.assessment].label}
            </Chip>
            <span className="text-sm text-muted">
              🔥 ~{showing.calories_in} kcal in · ~{showing.calories_out} kcal out
              {showing.target_calories != null && (
                <> · target ~{showing.target_calories}</>
              )}
            </span>
          </div>
          <p className="font-semibold text-foreground">{showing.headline}</p>
          {showing.tip && <p className="text-sm text-muted">💡 {showing.tip}</p>}
          <p className="text-xs text-muted/60">
            {isUnsavedDraft
              ? "Rough estimate — not saved yet"
              : save.isSuccess
                ? "Saved to progress ✓"
                : "Saved to progress"}
            {model ? ` · ${model}` : ""}
          </p>
        </div>
      )}
    </Card>
  );
}
