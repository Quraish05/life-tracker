"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { API_ORIGIN, API_V1_PREFIX, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mealsKey } from "@/lib/use-meals";

/** Turn the http(s) API origin into a ws(s) URL for the live-sync endpoint. */
function liveSyncUrl(token: string): string {
  const wsBase = API_ORIGIN.replace(/^http/, "ws"); // http->ws, https->wss
  return `${wsBase}${API_V1_PREFIX}/ws?token=${encodeURIComponent(token)}`;
}

/**
 * While the user is signed in, hold an authenticated WebSocket and refresh the
 * relevant React Query caches when the server pushes a change from the user's
 * other device/tab. Reconnects with exponential backoff — Render's free tier
 * drops idle sockets and networks flap.
 *
 * The socket does NOT replace React Query: it only marks data stale, then the
 * existing query refetches and the UI re-renders itself. Same refresh path a
 * local mutation already triggers via `invalidateQueries`.
 */
export function useLiveSync(): void {
  const { user } = useAuth();
  const userId = user?.id; // stable dep: reconnect on login/logout, not on every user refresh
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return; // only connect when signed in

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let closedByUs = false;

    const connect = () => {
      const token = tokenStore.get();
      if (!token) return;

      socket = new WebSocket(liveSyncUrl(token));

      socket.onopen = () => {
        attempts = 0; // reset backoff once we're connected
      };

      socket.onmessage = (event) => {
        let data: { type?: string };
        try {
          data = JSON.parse(event.data);
        } catch {
          return; // ignore non-JSON frames (e.g. keepalive text)
        }
        // A meal changed on another device -> mark the meals cache stale.
        if (data.type?.startsWith("meal.")) {
          queryClient.invalidateQueries({ queryKey: mealsKey });
        }
      };

      socket.onclose = () => {
        if (closedByUs) return; // unmount / logout: don't reconnect
        const delay = Math.min(30_000, 1_000 * 2 ** attempts); // capped exponential backoff
        attempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByUs = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [userId, queryClient]);
}
