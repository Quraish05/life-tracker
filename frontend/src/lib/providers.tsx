"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { AuthProvider } from "@/lib/auth-context";
import { LiveSync } from "@/lib/live-sync";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

/**
 * App-wide client providers. React Query sits outermost so any consumer
 * (including auth, later) can use it; auth stays inside.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session — created lazily so it isn't shared
  // across requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LiveSync />
        {children}
        <LoadingOverlay />
      </AuthProvider>
    </QueryClientProvider>
  );
}
