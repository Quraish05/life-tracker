import Link from "next/link";

import {
  ClosingCtaButton,
  FooterLinks,
  HeaderActions,
  HeroActions,
} from "@/components/landing/auth-cta";
import { FeatureCarousel } from "@/components/landing/feature-carousel";
import { BowlClock, BrandLockup } from "@/components/ui/atoms/logo";
import { ThemeToggle } from "@/components/ui/atoms/theme-toggle";
import { AI_FREE_LIMIT } from "@/constants/ai";

// Thyme marketing landing. Server component (the only interactive piece — the
// feature carousel and the auth-aware CTAs — are client islands). Theme-aware:
// dusk-plum in dark mode, a clean light equivalent via the semantic tokens.

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#loop" },
  { label: "Journal", href: "#reflect" },
  { label: "Pricing", href: "#pricing" },
];

const LOOP = [
  {
    n: 1,
    icon: "🎯",
    wash: "bg-grape/12",
    title: "Set a goal",
    body: "Health, personal or professional — with a date on it.",
  },
  {
    n: 2,
    icon: "🍽️",
    wash: "bg-peach/20",
    title: "Save your dishes",
    body: "Ingredients and macros once; a tap to log it after that.",
  },
  {
    n: 3,
    icon: "📅",
    wash: "bg-sky/20",
    title: "Log the day",
    body: "Slots for meals, chips for movement, a line in the journal.",
  },
  {
    n: 4,
    icon: "✨",
    wash: "bg-mint/25",
    title: "Read the briefing",
    body: "One card: calories in and out, the verdict, one nudge.",
  },
  {
    n: 5,
    icon: "📈",
    wash: "bg-butter/20",
    title: "See the pattern",
    body: "Findings with their evidence, and how the week aligned.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-background text-foreground">
      {/* Soft glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(1200px_600px_at_50%_-10%,var(--color-grape)_0%,transparent_60%)] opacity-[0.12]"
      />

      <div className="relative mx-auto max-w-[1380px] px-5 tablet:px-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b border-border/60 py-4">
          <BrandLockup markSize={32} textClassName="text-[19px]" />
          <nav className="flex items-center gap-6 text-[13px] font-semibold text-muted laptop:gap-7">
            <div className="hidden items-center gap-7 tablet:flex">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="transition hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <HeaderActions />
            <ThemeToggle />
          </nav>
        </header>

        {/* Hero */}
        <section className="grid items-start gap-12 py-14 laptop:grid-cols-[minmax(0,1fr)_452px] laptop:gap-14 laptop:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-[11.5px] font-semibold text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-grape" />
              Work in progress — new features landing often
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.04] tracking-[-0.035em] text-balance tablet:text-6xl">
              Track your life,
              <br />
              <span className="font-display italic font-normal text-grape">
                one day at a time.
              </span>
            </h1>
            <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-muted tablet:text-lg">
              Meals, workouts, moods and milestones in one small place. You
              write it the way you&rsquo;d say it — Thyme does the counting, the
              summarising and the remembering.
            </p>
            <HeroActions />
            <div className="mt-3 flex items-center gap-3">
              <svg
                width="64"
                height="46"
                viewBox="0 0 68 52"
                fill="none"
                aria-hidden
                className="hidden flex-none text-grape-deep laptop:block"
              >
                <path
                  d="M56 46C40 44 24 38 18 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 12l-8 9M18 12l10 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="font-hand text-2xl text-grape">
                free, and about a minute to start
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted/70">
              <span>Calories tracked</span>
              <span>·</span>
              <span>Heartful Journals</span>
              <span>·</span>
              <span>Works on your phone</span>
            </div>
          </div>

          {/* App preview card */}
          <div className="w-full max-w-md justify-self-center">
            <div className="rounded-[1.25rem] border border-border bg-surface p-5 shadow-2xl shadow-grape/10 tablet:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                Wednesday, 29 July
              </p>
              <h3 className="mt-1.5 font-hand text-3xl font-bold leading-tight">
                Good evening, Maya
              </h3>
              <div className="mt-4 rounded-xl border border-border bg-background/50 px-4 py-3.5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-grape-deep">
                  ✨ AI Summary
                </p>
                <p className="mt-2 text-sm leading-relaxed">
                  You&rsquo;re 60 kcal under target with dinner still to log — a
                  normal-size dinner keeps the 4-day streak.
                </p>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <p className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">
                    1,240
                  </span>
                  <span className="text-[13px] text-muted">of 1,900 kcal</span>
                </p>
                <span className="font-hand text-xl text-grape">
                  nearly there!
                </span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full w-[65%] rounded-full bg-grape" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { icon: "🥗", name: "Big green salad", val: "410 kcal" },
                  { icon: "💪", name: "Running", val: "30 min · 420 out" },
                  { icon: "🙂", name: "Mood", val: "Steady" },
                ].map((t) => (
                  <div
                    key={t.name}
                    className="rounded-xl border border-border bg-background/50 p-3"
                  >
                    <p className="text-base">{t.icon}</p>
                    <p className="mt-1.5 text-xs font-bold">{t.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{t.val}</p>
                  </div>
                ))}
              </div>
            </div>
            {/*   <p className="mt-3 text-center font-hand text-xl text-grape-deep">
              the briefing is written by the AI
            </p> */}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-16 laptop:py-24">
          <FeatureCarousel />
        </section>

        {/* AI panel */}
        <section className="py-6 laptop:py-10">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-gradient-to-br from-lilac/50 to-blush/40 p-8 dark:from-[#2a1533] dark:to-[#1c1222] tablet:p-12">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-coral/15 blur-3xl" />
            <div className="relative grid items-center gap-10 laptop:grid-cols-2 laptop:gap-16">
              <div>
                <span className="inline-flex rounded-full border border-grape/40 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-grape-deep">
                  ✨ Powered by AI
                </span>
                <h2 className="mt-5 text-3xl font-bold tracking-tight tablet:text-4xl">
                  Your day,{" "}
                  <span className="font-display italic font-normal text-grape">
                    actually understood
                  </span>
                </h2>
                <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-muted">
                  Log what you ate in plain words — &ldquo;two eggs, toast, big
                  salad at lunch&rdquo;. The estimate, the verdict and the nudge
                  come back in one card.
                </p>
                <div className="mt-6 flex flex-col gap-3.5">
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
                  ].map((p) => (
                    <div key={p.text} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface/80 text-sm">
                        {p.icon}
                      </span>
                      <span className="text-sm">{p.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="rounded-2xl border border-border bg-surface/90 p-5 shadow-2xl shadow-grape/10 tablet:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">✨ AI day summary</p>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-grape-deep">
                      ✓ On track
                    </span>
                  </div>
                  <p className="mt-3.5 text-[13.5px] text-muted">
                    🔥 <strong className="text-foreground">~1,650</strong> kcal
                    in · <strong className="text-foreground">~420</strong> out ·
                    target ~1,900
                  </p>
                  <p className="mt-3.5 font-display text-xl leading-snug">
                    Solid deficit day — nice work.
                  </p>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted">
                    💡 Add a protein source at dinner to hit your target.
                  </p>
                  <p className="mt-4 border-t border-border pt-3.5 text-[11.5px] text-muted/70">
                    Saved to progress ✓
                  </p>
                </div>
                <div className="mt-5 hidden items-start justify-end gap-2 laptop:flex">
                  <svg
                    width="56"
                    height="40"
                    viewBox="0 0 54 46"
                    fill="none"
                    aria-hidden
                    className="mt-4 flex-none text-grape-deep"
                  >
                    <path
                      d="M50 42C34 40 14 30 8 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8 8l-1 10M8 8l9 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="font-hand text-xl text-grape">
                    one card, no dashboard homework
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Loop */}
        <section id="loop" className="scroll-mt-20 py-16 laptop:py-24">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-grape">
              The flow
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight tablet:text-4xl">
              How it{" "}
              <span className="font-display italic font-normal text-grape">
                works
              </span>
            </h2>
            <p className="mt-3 text-sm text-muted">
              Five steps, from goal to progress.
            </p>
          </div>
          <div className="mt-12 grid gap-8 tablet:grid-cols-3 laptop:grid-cols-5 laptop:gap-4">
            {LOOP.map((s) => (
              <div
                key={s.n}
                className="flex max-w-[280px] flex-col items-center justify-self-center text-center"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-border text-2xl ${s.wash}`}
                >
                  {s.icon}
                </span>
                <span className="-mt-3 flex h-6 w-6 items-center justify-center rounded-full bg-grape text-[11px] font-bold text-on-accent">
                  {s.n}
                </span>
                <h3 className="mt-3.5 text-[15px] font-bold">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-center justify-center gap-3">
            <svg
              width="92"
              height="38"
              viewBox="0 0 150 58"
              fill="none"
              aria-hidden
              className="hidden flex-none text-grape-deep laptop:block"
            >
              <path
                d="M6 52C22 30 66 8 132 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M132 10l-11 5M132 10l-8-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p className="font-hand text-2xl text-grape">
              then it loops — tomorrow starts from here
            </p>
          </div>
        </section>

        {/* Reflect */}
        <section
          id="reflect"
          className="scroll-mt-20 grid gap-4 py-6 laptop:grid-cols-2 laptop:py-10"
        >
          <ReflectPanel
            eyebrow="Journal"
            title="The part numbers can't hold"
            body="Write an entry and tag the mood. Entries group by month, and a rail beside each one shows what you ate and did that day."
          >
            <div className="rounded-xl border border-border bg-background/50 px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Mon 27 July · 🌞 Great
              </p>
              <p className="mt-2 font-hand text-xl leading-snug">
                Gym felt good, cooked at home. Slept by 22:40 and it showed the
                next morning.
              </p>
            </div>
          </ReflectPanel>
          <ReflectPanel
            eyebrow="Notes"
            title="Lists, orders, half-thoughts"
            body="Four folders: Eating out, Shopping, Health and Recipes. Any note becomes a checklist with one tap, and pinned notes stay on top."
          >
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-border bg-background/50 px-4 py-3.5">
                <p className="text-[12.5px] font-bold">📌 Weekly basket</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  ✓ Greek yoghurt 1kg
                  <br />✓ Chicken thighs
                  <br />◦ Oat milk 2L
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 px-4 py-3.5">
                <p className="text-[12.5px] font-bold">🗂️ Eating out</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  Chicken bowl, no extra toum, double salad.
                </p>
              </div>
            </div>
          </ReflectPanel>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 py-16 laptop:py-24">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-grape">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight tablet:text-4xl">
              Start free,{" "}
              <span className="font-display italic font-normal text-grape">
                upgrade if it sticks
              </span>
            </h2>
          </div>
          <div className="mx-auto mt-9 grid max-w-3xl gap-4 laptop:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface/70 p-8">
              <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
                Everyday
              </p>
              <p className="mt-3.5 text-4xl font-bold tracking-tight">Free</p>
              <p className="mt-1.5 text-[13px] text-muted/70">
                {AI_FREE_LIMIT} AI actions to start
              </p>
              <div className="mt-5 flex flex-col gap-2.5 text-[13.5px] text-muted">
                <span>✓ Unlimited logs, dishes and notes</span>
                <span>✓ Calendar and patterns</span>
                <span>✓ Journal with mood tags</span>
              </div>
              <Link
                href="/register"
                className="mt-6 block rounded-full border border-border py-3 text-center text-[13.5px] font-bold transition hover:border-grape hover:text-grape"
              >
                Start free
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-grape/40 bg-surface p-8 dark:bg-[#2f1a3a]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-grape/20 blur-3xl" />
              <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-grape-deep">
                Pro
              </p>
              <p className="mt-3.5 text-4xl font-bold tracking-tight">
                $6
                <span className="text-[15px] font-semibold text-muted">
                  /mo
                </span>
              </p>
              <p className="mt-1.5 text-[13px] text-muted/70">
                Unlimited AI summaries
              </p>
              <div className="mt-5 flex flex-col gap-2.5 text-[13.5px] text-muted">
                <span>✓ Everything in Everyday</span>
                <span>✓ Weekly pattern digests</span>
                <span>✓ Export your whole history</span>
              </div>
              <Link
                href="/register"
                className="mt-6 block rounded-full bg-grape py-3 text-center text-[13.5px] font-bold text-on-accent transition hover:bg-grape-deep"
              >
                Go Pro
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center font-hand text-2xl text-grape">
            cancel anytime
          </p>
        </section>

        {/* CTA */}
        <section id="cta" className="scroll-mt-20 py-10 laptop:py-16">
          <div className="rounded-[1.5rem] bg-gradient-to-br from-grape-deep to-grape px-6 py-14 text-center shadow-2xl shadow-grape/30 tablet:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-on-accent tablet:text-4xl">
              Ready to start your story?
            </h2>
            <p className="mx-auto mt-3.5 max-w-md text-[15.5px] text-on-accent/75">
              It&rsquo;s free to begin, and it only takes a minute.
            </p>
            <div className="mt-7 flex justify-center">
              <ClosingCtaButton />
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-10 border-t border-border/60">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted tablet:flex-row tablet:px-8">
          <span className="flex items-center gap-2.5">
            <BowlClock size={22} className="text-grape" />
            <span className="font-bold text-foreground">Thyme</span>
            <span>· every day, seasoned.</span>
          </span>
          <div className="flex items-center gap-5 text-[12.5px] font-semibold">
            <FooterLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}

function ReflectPanel({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-gradient-to-br from-surface to-surface p-7 dark:from-[#2f1a3a] dark:to-[#271531] tablet:p-9">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-grape">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-5 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
