"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/atoms/button";

// Auth-aware call-to-action groups for the landing page.
//
// The landing page itself stays a server component; these small client islands
// read the (client-only) auth state. Until the stored session is restored we
// render the logged-out variant — it matches the server-rendered HTML, so there
// is no hydration mismatch, and it swaps to the dashboard CTA once `user` loads.

/** Header buttons: log in / get started, or a single dashboard link. */
export function HeaderActions() {
  const { user } = useAuth();

  if (user) {
    return (
      <Button asChild size="sm">
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 tablet:gap-3">
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/register">Get started</Link>
      </Button>
    </div>
  );
}

/** Hero buttons: sign up / log in, or a single "take me to the dashboard". */
export function HeroActions() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="mt-8 flex">
        <Button asChild size="lg">
          <Link href="/dashboard">Take me to the dashboard →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Button asChild size="lg">
        <Link href="/register">Create your account</Link>
      </Button>
      <Button asChild variant="secondary" size="lg">
        <Link href="/login">I already have one</Link>
      </Button>
    </div>
  );
}

/**
 * Closing CTA — the site's secondary call-to-action, styled as the design's dark
 * pill so it reads on the grape panel: "Go to your dashboard →" for a returning
 * (logged-in) visitor, "Get started — it's free →" otherwise.
 */
export function ClosingCtaButton() {
  const { user } = useAuth();

  return (
    <Link
      href={user ? "/dashboard" : "/register"}
      className="inline-flex items-center gap-2 rounded-full bg-background px-8 py-4 text-sm font-bold text-foreground shadow-lg transition hover:bg-surface"
    >
      {user ? "Go to your dashboard →" : "Get started — it’s free →"}
    </Link>
  );
}

/** Footer links: log in / sign up, or a single dashboard link. */
export function FooterLinks() {
  const { user } = useAuth();

  if (user) {
    return (
      <Link href="/dashboard" className="font-semibold hover:text-grape">
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className="font-semibold hover:text-grape">
        Log in
      </Link>
      <Link href="/register" className="font-semibold hover:text-grape">
        Sign up
      </Link>
    </>
  );
}
