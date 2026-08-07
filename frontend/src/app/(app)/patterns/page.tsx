"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { JournalInsight } from "@/types/journal";
import {
  useDeleteInsight,
  useSavedInsights,
  useVoteInsight,
} from "@/lib/queries/use-journal";
import { formatDayShort } from "@/components/calendar/_lib";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";
import { EmptyState } from "@/components/ui/molecules/empty-state";
import { PageHeader } from "@/components/ui/molecules/page-header";

/** "5 Aug" from a full ISO timestamp — when the finding was saved. */
function savedOn(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default function PatternsPage() {
  const { data: insights = [], isLoading } = useSavedInsights();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // The selected finding, falling back to the newest when nothing (or a
  // now-deleted one) is selected.
  const current = useMemo(
    () => insights.find((i) => i.id === selectedId) ?? insights[0] ?? null,
    [insights, selectedId],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Patterns"
        title={
          <>
            What your <AccentText>journal </AccentText> knows that your numbers
            don&rsquo;t
          </>
        }
        subtitle="Answers you saved from Ask my journal — each keeps the entries it drew from."
      />

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : insights.length === 0 ? (
        <EmptyState
          icon="📈"
          title={
            <>
              Nothing <AccentText tone="grape">saved yet</AccentText>
            </>
          }
          description="Ask your journal a question, then hit “Save to Patterns” to keep the answer here."
        />
      ) : (
        <div className="flex flex-col gap-5 laptop:flex-row laptop:items-start">
          {/* Findings list */}
          <div className="flex-1 space-y-2">
            {insights.map((insight) => (
              <FindingCard
                key={insight.id}
                insight={insight}
                active={current?.id === insight.id}
                onSelect={() => setSelectedId(insight.id)}
              />
            ))}
          </div>

          {/* Evidence panel for the selected finding */}
          {current && <EvidencePanel key={current.id} insight={current} />}
        </div>
      )}
    </div>
  );
}

/** One saved finding: its claim, when it was saved, and how many entries it cites. */
function FindingCard({
  insight,
  active,
  onSelect,
}: {
  insight: JournalInsight;
  active: boolean;
  onSelect: () => void;
}) {
  const deleteInsight = useDeleteInsight();
  const count = insight.citations.length;

  return (
    <Card
      tone={active ? "soft" : "glass"}
      padding="none"
      interactive={!active}
      className="flex items-start gap-1 p-4"
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">✨</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-grape">
            Finding
          </span>
          <span className="ml-auto text-[11px] font-semibold text-muted">
            Saved {savedOn(insight.created_at)}
          </span>
        </div>
        <p className="mt-2.5 line-clamp-3 text-[15px] font-semibold leading-snug text-foreground">
          {insight.answer}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone="muted" size="sm">
            from {count} {count === 1 ? "entry" : "entries"}
          </Chip>
          {insight.helpful === true && (
            <Chip tone="success" size="sm">
              ✓ True for me
            </Chip>
          )}
          {insight.helpful === false && (
            <Chip tone="danger" size="sm">
              Off base
            </Chip>
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={() => deleteInsight.mutate(insight.id)}
        disabled={deleteInsight.isPending}
        aria-label="Delete finding"
        title="Delete finding"
        className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-muted transition hover:bg-coral/15 hover:text-coral"
      >
        ✕
      </button>
    </Card>
  );
}

/** The right-hand aside: the finding's evidence quotes, the vote, and the method. */
function EvidencePanel({ insight }: { insight: JournalInsight }) {
  const vote = useVoteInsight();

  // Toggle off when tapping the already-chosen vote.
  function cast(next: boolean) {
    vote.mutate({
      id: insight.id,
      helpful: insight.helpful === next ? null : next,
    });
  }

  return (
    <aside className="w-full space-y-4 laptop:w-[352px] laptop:flex-none">
      <Card tone="glass" padding="md">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
          Evidence · the entries this drew from
        </p>
        <p className="mt-2 text-[15px] font-semibold leading-snug text-foreground">
          {insight.question}
        </p>

        <div className="mt-4 space-y-2">
          {insight.citations.length === 0 ? (
            <p className="text-sm text-muted">
              No entries were cited for this answer.
            </p>
          ) : (
            insight.citations.map((c) => (
              <Link
                key={c.note_id}
                href={`/journal/${c.note_id}`}
                className="block rounded-xl border border-border p-3 transition hover:border-grape/30 hover:bg-grape/5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {c.entry_date ? formatDayShort(c.entry_date) : "Undated"}
                  </span>
                  <span className="truncate text-[11px] text-muted">
                    {c.title}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">
                  “{c.snippet}”
                </p>
              </Link>
            ))
          )}
        </div>
      </Card>

      {/* Was this true for you? */}
      <Card tone="soft" padding="md">
        <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-grape">
          Was this true for you?
        </p>
        <p className="mt-2 text-xs text-muted">
          Marking findings helps you tell the ones that landed from the ones
          that missed.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => cast(true)}
            disabled={vote.isPending}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-bold transition ${
              insight.helpful === true
                ? "border-mint bg-mint/40 text-ink"
                : "border-border text-foreground hover:bg-grape/10"
            }`}
          >
            Yes, that&rsquo;s me
          </button>
          <button
            type="button"
            onClick={() => cast(false)}
            disabled={vote.isPending}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-bold transition ${
              insight.helpful === false
                ? "border-coral bg-coral/15 text-coral"
                : "border-border text-foreground hover:bg-grape/10"
            }`}
          >
            Off base
          </button>
        </div>
      </Card>

      {insight.model && (
        <p className="px-1 text-[11px] text-muted">
          ✨ {insight.model} · answered from your entries only · never used for
          training
        </p>
      )}
    </aside>
  );
}
