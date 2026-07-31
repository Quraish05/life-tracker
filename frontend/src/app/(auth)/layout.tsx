"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { readNextPath } from "@/lib/utils/next-path";
import { Spinner } from "@/components/ui/atoms/spinner";

/**
 * Guards the login/register pages: a signed-in user has no business here, so
 * once the session check settles we send them on — to wherever they were
 * headed (`?next=`) or the dashboard. While the check runs, or while a
 * signed-in user is being redirected, we show a loader instead of flashing the
 * auth form.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) router.replace(readNextPath() ?? "/dashboard");
  }, [isLoading, user, router]);

  if (isLoading || user) {
    return (
      <div className="flex h-dvh items-center justify-center gap-3 bg-gradient-to-br from-background via-background to-lilac/40 dark:to-grape/8">
        <Spinner aria-hidden />
        <p className="text-sm font-medium text-muted">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
