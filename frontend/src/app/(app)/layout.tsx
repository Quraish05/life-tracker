"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { currentReturnTarget } from "@/lib/next-path";
import { ReminderNotificationsProvider } from "@/lib/reminder-notifications";
import Sidebar from "@/components/Sidebar";
import { Spinner } from "@/components/ui/atoms/spinner";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Once the session check finishes, bounce anyone without a valid session —
  // remembering where they were headed so login can return them there.
  useEffect(() => {
    if (!isLoading && !user) {
      const next = encodeURIComponent(currentReturnTarget());
      router.replace(`/login?next=${next}`);
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center gap-3 bg-gradient-to-br from-background via-background to-lilac/40 dark:to-grape/8">
        <Spinner aria-hidden />
        <p className="text-sm font-medium text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <ReminderNotificationsProvider>
      <div className="flex h-dvh flex-col laptop:flex-row">
        <Sidebar />
        {/* Sidebar stays flush left; only the main content region is capped
            at max-w-content and centered on ultra-wide screens. */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-lilac/40 dark:to-grape/8">
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>
    </ReminderNotificationsProvider>
  );
}
