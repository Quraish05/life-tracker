import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FeatureCard } from "@/components/landing/feature-card";
import { FEATURES } from "@/components/landing/_lib";

// Marketing landing page. Intentionally a WIP showcase — feature cards below
// grow as new sections ship. Server component: no client state, renders fast.

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-cream via-cream to-lilac/40 text-ink">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-grape to-coral text-sm font-bold text-white shadow-md shadow-grape/30">
            LT
          </div>
          <span className="text-lg font-bold tracking-tight">
            Life <span className="font-display italic text-grape">Tracker</span>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-grape/20 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-grape shadow-sm backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          Work in progress — new features landing often
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Track your life,{" "}
          <span className="font-display italic text-grape">
            one day at a time
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink-soft sm:text-lg">
          Habits, moods, and milestones — all in one joyful little place that
          grows with you. Start with journaling today, and watch Life Tracker
          bloom into your whole life dashboard. ✨
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">Create your account</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/login">I already have one</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            What&rsquo;s{" "}
            <span className="font-display italic text-grape">inside</span>
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            A growing toolkit for a more intentional life.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-grape to-coral px-8 py-12 text-center shadow-xl shadow-grape/30">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to start your story?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/80 sm:text-base">
            It&rsquo;s free to begin, and it only takes a minute.
          </p>
          <div className="mt-7 flex justify-center">
            <Button asChild variant="secondary" size="lg">
              <Link href="/register">Get started — it&rsquo;s free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-ink-soft sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="font-bold text-ink">
              Life <span className="font-display italic text-grape">Tracker</span>
            </span>
            · Track your life, one day at a time.
          </span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="font-semibold hover:text-grape">
              Log in
            </Link>
            <Link href="/register" className="font-semibold hover:text-grape">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
