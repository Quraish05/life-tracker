"use client";

import { useState } from "react";

import { isQuotaError } from "@/lib/api";
import { useAskJournal } from "@/lib/queries/use-journal";
import { useAiQuota } from "@/lib/use-ai-quota";
import { AiLimitNotice, AiQuotaHint } from "@/components/ai/ai-quota";
import { formatDayShort } from "@/components/calendar/_lib";
import { Button } from "@/components/ui/atoms/button";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";

/**
 * Ask my journal — a natural-language question answered from the user's own
 * entries via RAG (hybrid retrieval + grounded generation). Citation chips open
 * the cited entry via the page's existing preview drawer (`onOpenEntry`).
 */
export function AskJournal({ onOpenEntry }: { onOpenEntry: (noteId: number) => void }) {
  const ask = useAskJournal();
  const quota = useAiQuota();
  const [question, setQuestion] = useState("");

  const outOfCredits = quota.exhausted || isQuotaError(ask.error);
  const canAsk = question.trim().length >= 3 && !ask.isPending && !outOfCredits;
  const answer = ask.data;

  function submit() {
    if (!canAsk) return;
    ask.mutate(question.trim(), { onSuccess: () => quota.refresh() });
  }

  return (
    <Card tone="soft" padding="md">
      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <h3 className="font-bold text-foreground">Ask my journal</h3>
        {!outOfCredits && <AiQuotaHint />}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How has my sleep been? When did I feel stressed about work?"
          aria-label="Ask a question about your journal"
          maxLength={500}
          disabled={outOfCredits}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition focus:border-grape focus:bg-surface focus:outline-none focus:ring-4 focus:ring-ring disabled:opacity-60"
        />
        <Button type="submit" size="sm" disabled={!canAsk}>
          {ask.isPending ? "Thinking…" : "Ask"}
        </Button>
      </form>

      {outOfCredits ? (
        <AiLimitNotice className="mt-3" />
      ) : ask.isError ? (
        <p className="mt-3 text-sm text-coral">
          {ask.error?.message || "Something went wrong. Please try again."}
        </p>
      ) : answer ? (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {answer.answer}
          </p>
          {answer.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">Sources:</span>
              {answer.citations.map((c) => (
                <Chip key={c.note_id} tone="soft" size="sm" interactive asChild>
                  <button
                    type="button"
                    onClick={() => onOpenEntry(c.note_id)}
                    title={c.snippet}
                  >
                    {c.entry_date ? formatDayShort(c.entry_date) : "Undated"} · {c.title}
                  </button>
                </Chip>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted/70">
          Answers are grounded in your entries, with links to the ones they draw from.
        </p>
      )}
    </Card>
  );
}
