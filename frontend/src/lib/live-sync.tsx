"use client";

import { useLiveSync } from "@/lib/use-live-sync";

/**
 * Mounts the live-sync WebSocket for the whole app. Renders nothing — it exists
 * only to run the hook once inside the providers, confining the client boundary
 * to this tiny component (per Next's guidance for client-only side effects).
 */
export function LiveSync() {
  useLiveSync();
  return null;
}
