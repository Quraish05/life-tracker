"use client";

import { useState } from "react";

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

/** Assessment → chip label + tone. Shared with the progress page. */
export const ASSESSMENT_META: Record<
  Assessment,
  { label: string; tone: "success" | "danger" | "muted" }
> = {
  on_track: { label: "✓ On track", tone: "success" },
  off_track: { label: "⚠️ Off track", tone: "danger" },
  no_data: { label: "No data", tone: "muted" },
};

/** The AI calorie/assessment numbers to persist alongside a generated note. */
type Snapshot = {
  calories_in: number;
  calories_out: number;
  target_calories: number | null;
  assessment: Assessment;
  headline: string;
  tip: string;
  model: string;
};

/**
 * The day's editable summary: a free-text note you can write yourself or draft
 * with AI, then save. Reuses the daily-summary AI call (which returns a prose
 * `narrative` plus calorie stats) — generating fills the textarea and snapshots
 * the numbers; typing your own saves note-only. `key` this by date so switching
 * days remounts with the right saved note.
 */
export function DaySummaryEditor({ date }: { date: string }) {
  const { data: saved } = useDaySummaryRecord(date);
  const generate = useDailySummary();
  const save = useSaveSummary();
  const quota = useAiQuota();

  // `draft` is the user's in-progress text; null means "show the saved note".
  const [draft, setDraft] = useState<string | null>(null);
  // Numbers from a fresh generation, saved with the note (null for typed-only).
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const savedNote = saved?.note ?? "";
  const text = draft ?? savedNote;
  const outOfCredits = quota.exhausted || isQuotaError(generate.error);

  // Structured stats to show as a chip: this session's snapshot, else the saved row.
  const stats = snapshot ?? saved ?? null;
  const showStats =
    stats != null &&
    stats.assessment != null &&
    stats.assessment !== "no_data" &&
    stats.calories_in != null;

  const changed =
    text.trim() !== savedNote.trim() || (snapshot !== null && !save.isSuccess);
  const canSave = text.trim().length > 0 && changed && !save.isPending;

  function handleGenerate() {
    save.reset();
    generate.mutate(date, {
      onSuccess: (data) => {
        setDraft(data.summary.narrative);
        setSnapshot({
          calories_in: data.summary.calories_in,
          calories_out: data.summary.calories_out,
          target_calories: data.summary.target_calories,
          assessment: data.summary.assessment,
          headline: data.summary.headline,
          tip: data.summary.tip,
          model: data.model,
        });
        quota.refresh();
      },
    });
  }

  function handleSave() {
    save.mutate(
      { summary_date: date, note: text.trim() || null, ...(snapshot ?? {}) },
      {
        onSuccess: () => {
          // Fall back to showing the freshly-saved note from the server.
          setDraft(null);
          setSnapshot(null);
        },
      },
    );
  }

  return (
    <Card tone="soft" padding="md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="font-bold text-foreground">Day summary</h3>
          {!outOfCredits && <AiQuotaHint />}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            disabled={generate.isPending || outOfCredits}
            title={outOfCredits ? "You've used all your free AI actions." : undefined}
          >
            {generate.isPending
              ? "Generating…"
              : text.trim()
                ? "✨ Redo with AI"
                : "✨ Generate with AI"}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!canSave}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {showStats && stats && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone={ASSESSMENT_META[stats.assessment!].tone} size="sm">
            {ASSESSMENT_META[stats.assessment!].label}
          </Chip>
          <span className="text-sm text-muted">
            🔥 ~{stats.calories_in} kcal in · ~{stats.calories_out} kcal out
            {stats.target_calories != null && <> · target ~{stats.target_calories}</>}
          </span>
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        placeholder="Write a summary of your day — or generate one with AI, then edit it."
        aria-label="Day summary"
        className="mt-3 w-full resize-y rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted/70 transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring"
      />

      {outOfCredits ? (
        <AiLimitNotice className="mt-2" />
      ) : (
        (generate.isError || save.isError) && (
          <p className="mt-2 text-sm text-coral">
            {(generate.error ?? save.error)?.message ||
              "Something went wrong. Please try again."}
          </p>
        )
      )}

      <p className="mt-2 text-xs text-muted/70">
        {save.isSuccess && !changed
          ? "Saved ✓"
          : changed && savedNote
            ? "Unsaved changes"
            : snapshot
              ? "AI draft — edit freely, then save"
              : "Saved with your day"}
      </p>
    </Card>
  );
}
