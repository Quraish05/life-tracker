"use client";

import { useEffect, useState } from "react";

import { isQuotaError } from "@/lib/api";
import type { Confidence, FollowUpKind, Note } from "@/types/note";
import { useAiQuota } from "@/lib/use-ai-quota";
import { useFollowUpSuggestions } from "@/lib/use-notes";
import { useCreateReminder } from "@/lib/use-reminders";
import { AiLimitNotice } from "@/components/ai/ai-quota";
import { Button } from "@/components/ui/atoms/button";
import { Chip, type ChipProps } from "@/components/ui/atoms/chip";
import { FormError } from "@/components/ui/atoms/form-error";
import {
  ModalDialog,
  ModalHeader,
  ModalOverlay,
} from "@/components/ui/molecules/modal";
import {
  fromDatetimeLocal,
  toDatetimeLocal,
} from "@/components/reminders/_lib";

type Props = {
  note: Note;
  onClose: () => void;
  /** Called after at least one reminder was created. */
  onDone: () => void;
};

// Confidence is a *routing hint*, never an auto-accept: high/medium items are
// pre-checked for convenience, low-confidence ones start unchecked so the user
// opts in deliberately (CCAF Domain 5.5 — human-in-the-loop review).
const CONFIDENCE_META: Record<
  Confidence,
  { label: string; tone: ChipProps["tone"] }
> = {
  high: { label: "High confidence", tone: "success" },
  medium: { label: "Medium", tone: "sky" },
  low: { label: "Low — worth a check", tone: "soft" },
};

const KIND_EMOJI: Record<FollowUpKind, string> = {
  task: "✅",
  event: "📅",
  unclear: "❓",
};

// Editable per-suggestion state — the AI proposes, the user tweaks and accepts.
type Row = {
  accepted: boolean;
  title: string;
  /** `datetime-local` value ("YYYY-MM-DDTHH:mm"); reminders require a time. */
  localWhen: string;
  error?: string;
};

export function FollowUpSuggestions({ note, onClose, onDone }: Props) {
  const quota = useAiQuota();
  const suggest = useFollowUpSuggestions(note, !quota.exhausted);
  const createReminder = useCreateReminder();
  const outOfCredits = quota.exhausted || isQuotaError(suggest.error);
  const refreshQuota = quota.refresh;

  // The extraction spends one AI credit on success — sync the counter.
  // Depend on the stable `refresh` (not the whole quota object, which is a new
  // literal each render) so this fires once per success, not in a loop.
  useEffect(() => {
    if (suggest.isSuccess) refreshQuota();
  }, [suggest.isSuccess, refreshQuota]);

  const [rows, setRows] = useState<Row[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed editable rows once, when suggestions arrive. Setting state during
  // render (guarded so it runs once) is React's endorsed alternative to a
  // syncing effect — it avoids the cascading re-render an effect would cause.
  if (suggest.data && !seeded) {
    setSeeded(true);
    setRows(
      suggest.data.suggestions.map((s) => ({
        accepted: s.confidence !== "low",
        title: s.title,
        localWhen: s.remind_at ? toDatetimeLocal(s.remind_at) : "",
      })),
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function patchRow(i: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, ...patch, error: undefined } : r,
      ),
    );
  }

  async function onAdd() {
    setFormError(null);
    const chosen = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.accepted);

    if (chosen.length === 0) {
      setFormError("Tick at least one follow-up to add.");
      return;
    }
    // Reminders need a title and a time — flag any accepted row that's missing one.
    let invalid = false;
    for (const { row, index } of chosen) {
      if (!row.title.trim() || !row.localWhen) {
        patchRow(index, {
          error: !row.localWhen ? "Pick a time" : "Add a title",
        });
        invalid = true;
      }
    }
    if (invalid) return;

    setSaving(true);
    try {
      await Promise.all(
        chosen.map(({ row }) =>
          createReminder.mutateAsync({
            title: row.title.trim(),
            remind_at: fromDatetimeLocal(row.localWhen),
            target_type: "note",
            target_id: note.id,
          }),
        ),
      );
      onDone();
    } catch {
      setFormError("Couldn't create the reminders. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const acceptedCount = rows.filter((r) => r.accepted).length;
  const hasRows = rows.length > 0;

  return (
    <ModalOverlay className="z-50 items-start overflow-y-auto sm:p-8">
      <ModalDialog size="md" className="my-auto">
        <ModalHeader onClose={onClose}>
          Suggested{" "}
          <span className="font-display italic text-grape">follow-ups</span>
        </ModalHeader>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-ink-soft">
            Reminders we found in “{note.title}”. Review, adjust the time, and
            add the ones you want — nothing is created until you do.
          </p>

          <FormError message={formError ?? undefined} />

          {outOfCredits && <AiLimitNotice />}

          {!outOfCredits && suggest.isLoading && (
            <p className="py-6 text-center text-sm text-ink-soft">
              Reading your note…
            </p>
          )}

          {!outOfCredits && suggest.isError && (
            <div className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
              {suggest.error.message}
            </div>
          )}

          {suggest.isSuccess && !hasRows && (
            <p className="py-6 text-center text-sm text-ink-soft">
              No follow-ups found — nothing here looks like something to be
              reminded about.
            </p>
          )}

          {hasRows && (
            <ul className="space-y-3">
              {suggest.data!.suggestions.map((s, i) => {
                const row = rows[i];
                if (!row) return null;
                const conf = CONFIDENCE_META[s.confidence];
                return (
                  <li
                    key={i}
                    className={`rounded-2xl border p-4 transition ${
                      row.accepted
                        ? "border-grape/40 bg-white/70"
                        : "border-lilac/40 bg-white/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={row.accepted}
                        onChange={(e) =>
                          patchRow(i, { accepted: e.target.checked })
                        }
                        aria-label={`Add "${row.title}"`}
                        className="mt-2 size-4 accent-grape"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          value={row.title}
                          onChange={(e) =>
                            patchRow(i, { title: e.target.value })
                          }
                          className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-ink transition focus:border-lilac/60 focus:bg-white focus:outline-none"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip tone={conf.tone} size="sm">
                            {KIND_EMOJI[s.kind]} {conf.label}
                          </Chip>
                          <input
                            type="datetime-local"
                            value={row.localWhen}
                            onChange={(e) =>
                              patchRow(i, { localWhen: e.target.value })
                            }
                            className="rounded-lg border border-lilac/60 bg-cream/80 px-2 py-1 text-xs text-ink transition focus:border-grape focus:bg-white focus:outline-none"
                          />
                          {!s.remind_at && !row.localWhen && (
                            <span className="text-xs text-ink-soft/80">
                              no time in the note — pick one
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-soft">{s.reason}</p>
                        {row.error && (
                          <p className="text-xs font-semibold text-coral">
                            {row.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-lilac/40 px-6 py-4">
          {/*  <span className="text-xs text-ink-soft">
            {suggest.data ? `via ${suggest.data.model}` : ""}
          </span> */}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {hasRows ? "Cancel" : "Close"}
            </Button>
            {hasRows && (
              <Button
                type="button"
                onClick={onAdd}
                disabled={saving || acceptedCount === 0}
              >
                {saving
                  ? "Adding…"
                  : `Add ${acceptedCount} reminder${acceptedCount === 1 ? "" : "s"}`}
              </Button>
            )}
          </div>
        </div>
      </ModalDialog>
    </ModalOverlay>
  );
}
