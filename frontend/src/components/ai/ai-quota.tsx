"use client";

import { useAiQuota } from "@/lib/use-ai-quota";
import { cn } from "@/lib/utils";

/**
 * A subtle inline hint of how many free AI actions remain, shown next to an AI
 * button. Renders nothing for the superadmin (unlimited). Turns coral once the
 * pool is spent so the cost is legible right where it's paid.
 */
export function AiQuotaHint({ className }: { className?: string }) {
  const { unlimited, remaining } = useAiQuota();
  if (unlimited || remaining === null) return null;

  return (
    <span
      className={cn(
        "text-xs",
        remaining <= 0 ? "font-semibold text-coral" : "text-muted",
        className,
      )}
    >
      {remaining <= 0
        ? "No free AI actions left"
        : `${remaining} free AI ${remaining === 1 ? "action" : "actions"} left`}
    </span>
  );
}

/**
 * Compact AI-quota pill for the app chrome (sidebar). Shows "Unlimited" for the
 * superadmin, "N of M left" otherwise, coral once exhausted.
 */
export function AiQuotaBadge({ className }: { className?: string }) {
  const { unlimited, remaining, limit, exhausted } = useAiQuota();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        exhausted ? "bg-coral/15 text-coral" : "bg-surface/60 text-grape-deep",
        className,
      )}
    >
      <span aria-hidden>✨</span>
      <span>
        AI ·{" "}
        {unlimited || remaining === null
          ? "Unlimited"
          : `${remaining} of ${limit} left`}
      </span>
    </div>
  );
}

/**
 * The "you're out of free AI actions" prompt. Message-only for now — there's no
 * payment gateway yet, so it explains the limit rather than dead-ending on an
 * Upgrade button. Render it when the pool is exhausted or a 429 comes back.
 */
export function AiLimitNotice({ className }: { className?: string }) {
  const { limit } = useAiQuota();

  return (
    <div
      className={cn(
        "rounded-2xl border border-grape/25 bg-lilac/25 px-4 py-3",
        className,
      )}
    >
      <p className="text-sm font-semibold text-grape-deep">
        ✨ You&rsquo;ve used all {limit} free AI actions
      </p>
      <p className="mt-0.5 text-xs text-muted">
        Paid plans with more AI are coming soon — thanks for trying it out!
      </p>
    </div>
  );
}
