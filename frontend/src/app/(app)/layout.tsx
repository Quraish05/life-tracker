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
      <div className="flex h-dvh items-center justify-center bg-gradient-to-br from-cream via-cream to-lilac/40">
        <p className="text-sm font-medium text-ink-soft">Loading…</p>
      </div>
    );
  }

  return (
    <ReminderNotificationsProvider>
      <div className="flex h-dvh">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-cream via-cream to-lilac/40">
          {children}
        </main>
      </div>
    </ReminderNotificationsProvider>
  );
}
