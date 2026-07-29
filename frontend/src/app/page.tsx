import { FeatureCard } from "@/components/landing/feature-card";
import { FEATURES } from "@/components/landing/_lib";
import { HowItWorks } from "@/components/landing/how-it-works";
import {
  ClosingCtaButton,
  FooterLinks,
  HeaderActions,
  HeroActions,
} from "@/components/landing/auth-cta";
import { ThemeToggle } from "@/components/ui/atoms/theme-toggle";

// Marketing landing page. Intentionally a WIP showcase — feature cards below
// grow as new sections ship. Server component: no client state, renders fast.

export default function LandingPage() {
  return (
    <div className="relative bg-gradient-to-br from-background via-background to-lilac/40 text-foreground">
      <ThemeToggle className="absolute right-4 top-4 z-20 tablet:right-6" />
      {/* Hero screen — header + hero fill the viewport on landing, but cap the
          height so tall monitors don't leave a huge gap before the features. */}
      <div className="flex min-h-[min(100dvh,900px)] flex-col">
        {/* Header */}
        {/* <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-grape to-coral text-sm font-bold text-white shadow-md shadow-grape/30">
              LT
            </div>
            <span className="text-lg font-bold tracking-tight">
              Life <span className="font-display italic text-grape">Tracker</span>
            </span>
          </div>
          <HeaderActions />
        </header> */}

        {/* Hero — grows to fill the remaining height, centered */}
        <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-grape/20 bg-surface/70 px-3.5 py-1.5 text-xs font-semibold text-grape shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Work in progress — new features landing often
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight tablet:text-6xl">
            Track your life,{" "}
            <span className="font-display italic text-grape">
              one day at a time.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted tablet:text-lg">
            Habits, moods, and milestones — all in one joyful little place that
            grows with you. Start with journaling today, and watch Life Tracker
            bloom into your whole life dashboard. ✨
          </p>
          <HeroActions />
        </section>
      </div>

      {/* AI highlight */}
      <section className="mx-auto max-w-6xl px-6 pt-16 tablet:pt-14">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-grape/15 via-lilac/40 to-blush/40 p-8 shadow-xl shadow-grape/10 dark:from-[#241528] dark:via-[#1f1324] dark:to-[#1c1222] tablet:p-12">
          {/* soft decorative glows for depth */}
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-coral/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-sky/30 blur-3xl" />

          <div className="relative grid items-center gap-10 laptop:grid-cols-2">
            {/* copy */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-grape shadow-sm">
                ✨ Powered by AI
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tablet:text-4xl">
                Your day,{" "}
                <span className="font-display italic text-grape">
                  actually understood
                </span>
              </h2>
              <p className="mt-4 max-w-md text-base text-muted">
                Just log what you ate and how you moved — the AI does the rest.
                No calorie counting, no spreadsheets.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  {
                    icon: "🔥",
                    text: "Estimates calories in vs out from your plain-text logs",
                  },
                  {
                    icon: "🎯",
                    text: "Tells you if you're on track for your goal",
                  },
                  {
                    icon: "💡",
                    text: "Gives one quick tip — then saves it to your progress",
                  },
                ].map((row) => (
                  <li key={row.text} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface/80 text-base shadow-sm">
                      {row.icon}
                    </span>
                    <span className="pt-1.5 text-sm font-medium text-foreground">
                      {row.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* product preview: a mock of the real AI summary card */}
            <div className="relative mx-auto w-full max-w-sm">
              <div className="rotate-1 rounded-3xl border border-border/70 bg-surface/90 p-5 shadow-2xl shadow-grape/20 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <span className="font-bold text-foreground">AI day summary</span>
                  </div>
                  <span className="rounded-full bg-mint/60 px-2.5 py-1 text-xs font-bold text-ink">
                    ✓ On track
                  </span>
                </div>
                <p className="mt-4 text-sm text-muted">
                  🔥 <span className="font-semibold text-foreground">~1,650</span> kcal
                  in · <span className="font-semibold text-foreground">~420</span> out
                  · target ~1,900
                </p>
                <p className="mt-3 font-display text-xl text-foreground">
                  Solid deficit day — nice work.
                </p>
                <p className="mt-2 text-sm text-muted">
                  💡 Add a protein source at dinner to hit your target.
                </p>
                <p className="mt-4 border-t border-border/40 pt-3 text-xs text-muted/70">
                  Saved to progress ✓
                </p>
              </div>
              {/* floating log chips for a touch of life */}
              <div className="absolute -left-3 -top-4 hidden -rotate-6 rounded-2xl bg-surface/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg tablet:block">
                🥗 Big green salad
              </div>
              <div className="absolute -bottom-4 -right-2 hidden rotate-6 rounded-2xl bg-surface/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg tablet:block">
                💪 Running · 30 min
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* Features */}
      {/* <section className="mx-auto max-w-6xl px-6 pb-20 pt-8 tablet:pt-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tablet:text-3xl">
            What&rsquo;s{" "}
            <span className="font-display italic text-grape">inside</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            A growing toolkit for a more intentional life.
          </p>
        </div>
        <div className="grid gap-5 tablet:grid-cols-2 laptop:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </section> */}

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-16 tablet:pt-40">
        <div className="rounded-3xl bg-grape px-6 py-10 text-center shadow-xl shadow-grape/30 tablet:px-8 tablet:py-12">
          <h2 className="text-2xl font-bold text-white tablet:text-3xl">
            Ready to start your story?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/80 tablet:text-base">
            It&rsquo;s free to begin, and it only takes a minute.
          </p>
          <div className="mt-7 flex justify-center">
            <ClosingCtaButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted tablet:flex-row">
          <span className="flex items-center gap-2">
            <span className="font-bold text-foreground">
              Life{" "}
              <span className="font-display italic text-grape">Tracker</span>
            </span>
            · Track your life, one day at a time.
          </span>
          <div className="flex items-center gap-4">
            <FooterLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}
