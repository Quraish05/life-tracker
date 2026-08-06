"use client";

import { useState } from "react";

import { isQuotaError } from "@/lib/api";
import type { EvalScope, GoalEvaluation, GoalSignal } from "@/types/health-goal";
import { useEvaluateGoal } from "@/lib/queries/use-health-goal";
import { useAiQuota } from "@/lib/use-ai-quota";
import { AiLimitNotice, AiQuotaHint } from "@/components/ai/ai-quota";
import { Button } from "@/components/ui/atoms/button";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";

const SCOPES: { key: EvalScope; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
];

/**
 * The Goal Evaluator rail: an on-demand AI read on how a window (today or the
 * last 7 days) aligns with the goal. The dashboard's metrics are free; this is
 * the one paid piece, so it runs only on click and is quota-charged. Mirrors the
 * quota UX of AskJournal / DaySummaryEditor.
 */
export function GoalEvaluator() {
  const evaluate = useEvaluateGoal();
  const quota = useAiQuota();
  const [scope, setScope] = useState<EvalScope>("week");

  const outOfCredits = quota.exhausted || isQuotaError(evaluate.error);
  const result = evaluate.data?.evaluation ?? null;

  function run(next: EvalScope) {
    setScope(next);
    if (outOfCredits) return;
    evaluate.mutate(next, { onSuccess: () => quota.refresh() });
  }

  return (
    <Card tone="glass" padding="md" className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-grape-deep">
            ✨ Goal evaluator
          </span>
          {!outOfCredits && <AiQuotaHint className="ml-auto" />}
        </div>

        <div className="mt-3 flex gap-1.5">
          {SCOPES.map((s) => (
            <Button
              key={s.key}
              type="button"
              variant={scope === s.key ? "primary" : "secondary"}
              size="sm"
              className="flex-1"
              onClick={() => run(s.key)}
              disabled={evaluate.isPending || outOfCredits}
            >
              {evaluate.isPending && scope === s.key ? "Reading…" : s.label}
            </Button>
          ))}
        </div>
      </div>

      {outOfCredits ? (
        <AiLimitNotice />
      ) : evaluate.isError ? (
        <p className="text-sm text-coral">
          {evaluate.error?.message || "Couldn't evaluate right now. Please try again."}
        </p>
      ) : result ? (
        <Evaluation result={result} />
      ) : (
        <p className="text-xs leading-relaxed text-muted/80">
          Pick a window and I&rsquo;ll read your logged meals and workouts against your
          goal — a score, what&rsquo;s helping, what&rsquo;s working against you, and one
          thing to adjust.
        </p>
      )}
    </Card>
  );
}

function Evaluation({ result }: { result: GoalEvaluation }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Score + verdict */}
      <div className="flex items-center gap-4">
        <ScoreRing score={result.alignment_score} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
            Alignment
          </p>
          <p className="mt-1 font-display text-lg italic leading-tight text-foreground">
            {result.verdict}
          </p>
        </div>
      </div>

      {/* Readout */}
      <div className="rounded-xl border border-grape/25 bg-lilac/25 p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-grape-deep">
          Read on your progress
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground">{result.readout}</p>
      </div>

      {result.helping.length > 0 && (
        <SignalList title="Helping" signals={result.helping} tone="success" />
      )}
      {result.hurting.length > 0 && (
        <SignalList title="Working against you" signals={result.hurting} tone="danger" />
      )}

      {result.adjustment && (
        <div className="rounded-xl border border-border bg-background/60 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            💡 One adjustment
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-foreground">
            {result.adjustment}
          </p>
        </div>
      )}
    </div>
  );
}

/** A donut ring showing the 0–100 alignment score. */
function ScoreRing({ score }: { score: number }) {
  const deg = Math.round((Math.max(0, Math.min(100, score)) / 100) * 360);
  return (
    <div
      className="flex h-[68px] w-[68px] flex-none items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--color-grape) ${deg}deg, var(--color-lilac) 0)`,
      }}
    >
      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-surface">
        <span className="text-lg font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

function SignalList({
  title,
  signals,
  tone,
}: {
  title: string;
  signals: GoalSignal[];
  tone: "success" | "danger";
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{title}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {signals.map((s, i) => (
          <div
            key={`${title}-${i}`}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-background/60 px-3 py-2"
          >
            {s.emoji && <span className="text-[13px]">{s.emoji}</span>}
            <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-foreground">
              {s.text}
            </span>
            {s.value && (
              <Chip tone={tone} size="sm">
                {s.value}
              </Chip>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
