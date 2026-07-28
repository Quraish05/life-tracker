"use client";

import { useAuth } from "@/lib/auth-context";

export type AiQuota = {
  /** No limit applies (the superadmin). */
  unlimited: boolean;
  /** Free AI actions left; `null` when unlimited. */
  remaining: number | null;
  /** Size of the free pool (informational). */
  limit: number;
  /** A regular user who has spent their whole pool. */
  exhausted: boolean;
  /** Re-fetch the user so `remaining` reflects the latest server count. */
  refresh: () => Promise<void>;
};

/**
 * The signed-in user's AI usage quota, derived from the auth context. Call
 * `refresh()` after a successful AI action so the count stays in sync with the
 * server (the backend only charges successful calls, so we trust it over a
 * local guess).
 */
export function useAiQuota(): AiQuota {
  const { user, refreshUser } = useAuth();

  const remaining = user?.ai_remaining ?? null;
  const unlimited = remaining === null;

  return {
    unlimited,
    remaining,
    limit: user?.ai_limit ?? 0,
    exhausted: !unlimited && remaining <= 0,
    refresh: refreshUser,
  };
}
