"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { ReminderNotificationsProvider } from "@/lib/reminder-notifications";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Once the session check finishes, bounce anyone without a valid session.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gradient-to-br from-background via-background to-lilac/40">
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
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-lilac/40">
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>
    </ReminderNotificationsProvider>
  );
}
