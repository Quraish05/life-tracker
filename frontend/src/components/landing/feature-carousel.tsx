"use client";

import { useState } from "react";

type Row = { icon: string; name: string; val: string };
type Feature = {
  icon: string;
  wash: string;
  title: string;
  body: string;
  meta: string;
  rows: Row[];
};

// The eight shipped screens, mirroring the app's real surfaces.
const FEATURES: Feature[] = [
  {
    icon: "🌤️",
    wash: "bg-grape/12",
    title: "Today, in one screen",
    body: "The briefing sits at the top, targets underneath, and everything you logged shows up in the order it happened.",
    meta: "Today · the home screen",
    rows: [
      { icon: "🔥", name: "1,240 of 1,900 kcal", val: "on track" },
      { icon: "✨", name: "AI briefing", val: "60 under" },
      { icon: "🏃", name: "Movement", val: "420 out" },
    ],
  },
  {
    icon: "📅",
    wash: "bg-sky/20",
    title: "A month you can read back",
    body: "Month, week and list views. Every day carries dots for meals, movement, journal and reminders — pick one and the rail opens it.",
    meta: "Month · week · list",
    rows: [
      { icon: "📆", name: "21 of 29 days logged", val: "July" },
      { icon: "✨", name: "Month pattern", val: "Fridays" },
      { icon: "📓", name: "Wed 29 July", val: "1,240" },
    ],
  },
  {
    icon: "✍️",
    wash: "bg-peach/20",
    title: "Logging takes four taps",
    body: "Quick-add a slot, search your dishes, set the portion. Movement has its own chips, and recipes take markdown.",
    meta: "Log · quick add",
    rows: [
      { icon: "🌅", name: "Breakfast · 6–11am", val: "logged" },
      { icon: "🔍", name: "Search your 24 dishes", val: "dish" },
      { icon: "🚶", name: "Morning walk", val: "42 min" },
    ],
  },
  {
    icon: "🍽️",
    wash: "bg-butter/20",
    title: "Dishes you save once",
    body: "Ingredients, macros and how often you've eaten it. Filter by slot, open one and its whole history is there.",
    meta: "24 dishes · P·C·F",
    rows: [
      { icon: "🥙", name: "Chicken shawarma bowl", val: "620 · 18×" },
      { icon: "🥣", name: "Greek yoghurt, berries", val: "310 · 31×" },
      { icon: "🐟", name: "Miso salmon + greens", val: "540 · 12×" },
    ],
  },
  {
    icon: "📈",
    wash: "bg-mint/25",
    title: "Findings that show their evidence",
    body: "Every claim opens the days behind it, the method and the maths. Suggested actions do nothing until you accept them.",
    meta: "Patterns · evidence",
    rows: [
      { icon: "😴", name: "Sleep dips midweek", val: "evidence" },
      { icon: "💬", name: "Journal word: gym", val: "82% on target" },
      { icon: "🌙", name: "Wind-down at 22:30", val: "suggested" },
    ],
  },
  {
    icon: "📓",
    wash: "bg-grape/12",
    title: "A journal grouped by month",
    body: "A mood on every entry, search across all of them, and a rail showing what you ate and did on that same day.",
    meta: "Reflect · 4-day streak",
    rows: [
      { icon: "🌞", name: "Gym felt good, cooked at home", val: "Great" },
      { icon: "😐", name: "Rest day, long standup", val: "Flat" },
      { icon: "🔎", name: "Filter by mood", val: "5 moods" },
    ],
  },
  {
    icon: "🗂️",
    wash: "bg-sky/20",
    title: "Notes and checklists, in folders",
    body: "Eating out, Shopping, Health and Recipes. Any note turns into a checklist, and the pinned ones stay at the top.",
    meta: "Notes · pinned first",
    rows: [
      { icon: "📌", name: "Orders that work when I'm out", val: "Eating out" },
      { icon: "🛒", name: "Weekly basket", val: "checklist" },
      { icon: "🩺", name: "What the dietitian said", val: "Health" },
    ],
  },
  {
    icon: "🎯",
    wash: "bg-butter/20",
    title: "Goals with an evaluator",
    body: "Health, personal and professional goals with dates on them. The evaluator scores the week's alignment and says what to change.",
    meta: "Goals · alignment",
    rows: [
      { icon: "⚖️", name: "Lose 4 kg by 30 September", val: "day 29 of 92" },
      { icon: "🏃", name: "Run 10k without stopping", val: "65%" },
      { icon: "✨", name: "Alignment this week", val: "7-day bars" },
    ],
  },
];

/**
 * The features showcase: one active card at a time with prev/next, dot
 * indicators and a handwritten counter. Client-only for the interaction; the
 * cards themselves are pure content.
 */
export function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const n = FEATURES.length;
  const f = FEATURES[active];

  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-grape">
            What&rsquo;s inside
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight tablet:text-4xl">
            Everything you&rsquo;d track,{" "}
            <span className="font-display italic text-grape">
              for a productive day
            </span>
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Day Log, Calendar, Meals, Patterns, Journal, Notes and Goals — all
            bundled.
          </p>
        </div>
        <div className="hidden shrink-0 gap-2.5 tablet:flex">
          <ArrowButton
            dir="prev"
            onClick={() => setActive((a) => (a - 1 + n) % n)}
          />
          <ArrowButton
            dir="next"
            onClick={() => setActive((a) => (a + 1) % n)}
          />
        </div>
      </div>

      {/* Coverflow: active card centred, neighbours peek dimmed on both sides. */}
      <div className="relative mt-10 h-[424px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        {FEATURES.map((feat, i) => {
          const rel = (i - active + n) % n;
          const d = rel > n / 2 ? rel - n : rel; // signed distance, wraps around
          const abs = Math.abs(d);
          const isActive = d === 0;
          return (
            <button
              type="button"
              key={feat.title}
              onClick={() => setActive(i)}
              aria-label={feat.title}
              aria-current={isActive}
              className="absolute left-1/2 top-2 flex h-[404px] w-[336px] flex-col rounded-[1.25rem] border p-6 text-left transition-[transform,opacity] duration-500 ease-out"
              style={{
                transform: `translateX(-50%) translateX(${d * 320}px) scale(${
                  isActive ? 1 : abs === 1 ? 0.9 : 0.8
                })`,
                opacity: abs > 2 ? 0 : isActive ? 1 : abs === 1 ? 0.55 : 0.25,
                zIndex: 10 - abs,
                pointerEvents: abs > 2 ? "none" : "auto",
                borderColor: isActive ? "var(--color-grape)" : "var(--color-border)",
                background: isActive ? "var(--color-surface)" : "var(--color-background)",
                boxShadow: isActive ? "0 30px 70px -30px rgba(0,0,0,.55)" : "none",
              }}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${feat.wash}`}>
                {feat.icon}
              </span>
              <h3 className="mt-5 text-xl font-bold tracking-tight">{feat.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{feat.body}</p>
              <div className="mt-5 flex flex-col gap-2">
                {feat.rows.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-background/50 px-3 py-2.5"
                  >
                    <span className="text-[13px]">{r.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                      {r.name}
                    </span>
                    <span className="text-[11px] text-muted">{r.val}</span>
                  </div>
                ))}
              </div>
              <span className="mt-auto pt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                {feat.meta}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile arrows */}
      <div className="mt-6 flex justify-center gap-2.5 tablet:hidden">
        <ArrowButton
          dir="prev"
          onClick={() => setActive((a) => (a - 1 + n) % n)}
        />
        <ArrowButton dir="next" onClick={() => setActive((a) => (a + 1) % n)} />
      </div>

      {/* Dots */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {FEATURES.map((feat, i) => (
          <button
            key={feat.title}
            type="button"
            aria-label={feat.title}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${
              i === active ? "w-6 bg-grape" : "w-2 bg-border hover:bg-grape/40"
            }`}
          />
        ))}
      </div>
      <p className="mt-4 text-center font-hand text-2xl text-grape">
        {active + 1} of {n} — {f.title.toLowerCase()}
      </p>
    </div>
  );
}

function ArrowButton({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous feature" : "Next feature"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition hover:border-grape hover:text-grape"
    >
      {dir === "prev" ? "←" : "→"}
    </button>
  );
}
