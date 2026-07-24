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
      <div className="mt-8 flex justify-center">
        <Button asChild size="lg">
          <Link href="/dashboard">Take me to the dashboard →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <Button asChild size="lg">
        <Link href="/register">Create your account</Link>
      </Button>
      <Button asChild variant="secondary" size="lg">
        <Link href="/login">I already have one</Link>
      </Button>
    </div>
  );
}

/** Closing CTA button: get started, or go to the dashboard. */
export function ClosingCtaButton() {
  const { user } = useAuth();

  return (
    <Button asChild variant="secondary" size="lg">
      <Link href={user ? "/dashboard" : "/register"}>
        {user ? "Go to your dashboard" : "Get started — it’s free"}
      </Link>
    </Button>
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
