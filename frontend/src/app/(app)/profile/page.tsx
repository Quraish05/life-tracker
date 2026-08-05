"use client";

import { useState } from "react";

import { authApi, tokenStore, IS_DEV, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAiQuota } from "@/lib/use-ai-quota";
import { Button } from "@/components/ui/atoms/button";
import { AccentText } from "@/components/ui/atoms/accent-text";
import { Card } from "@/components/ui/atoms/card";
import { Chip } from "@/components/ui/atoms/chip";
import { PageHeader } from "@/components/ui/molecules/page-header";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const quota = useAiQuota();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 tablet:px-6 tablet:py-10">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const quotaLabel = quota.unlimited
    ? "Unlimited"
    : `${quota.remaining} of ${quota.limit} left`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        eyebrow="Account"
        title={
          <>
            Your <AccentText>profile</AccentText>
          </>
        }
        subtitle="Your account details and AI usage."
      />

      <Card tone="glass" padding="md" className="space-y-4">
        <Field label="Username" value={user.username} />
        <Field label="Email" value={user.email} />
        <Field
          label="Role"
          value={
            <Chip tone={user.role === "superadmin" ? "solid" : "soft"} size="sm">
              {user.role}
            </Chip>
          }
        />
        <Field label="Member since" value={memberSince} />
        <Field label="AI actions" value={quotaLabel} />
      </Card>

      {IS_DEV && <DemoResetCard onDone={refreshUser} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

/**
 * DEMO/DEV ONLY. Rendered only under `next dev` (see `IS_DEV`); the backend
 * route it calls is likewise absent in production. Lets a local test user reset
 * their AI pool back to full so a demo session doesn't run out of credits.
 */
function DemoResetCard({ onDone }: { onDone: () => Promise<void> }) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    const token = tokenStore.get();
    if (!token) return;
    setStatus("working");
    setError(null);
    try {
      await authApi.resetAiQuota(token);
      await onDone();
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Couldn't reset. Try again.");
    }
  }

  return (
    <Card tone="dashed" padding="md" className="mt-5">
      <div className="flex items-start gap-2">
        <span className="text-base">🧪</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            Demo tools <span className="font-semibold text-muted">· local only</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Reset your AI actions back to full so testing doesn&rsquo;t exhaust the
            free pool. This card and its endpoint exist only outside production.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={reset}
          disabled={status === "working"}
        >
          {status === "working" ? "Resetting…" : "Reset AI limit"}
        </Button>
        {status === "done" && (
          <Chip tone="success" size="sm">
            ✓ Reset to full
          </Chip>
        )}
        {status === "error" && error && (
          <span className="text-xs font-semibold text-coral">{error}</span>
        )}
      </div>
    </Card>
  );
}
