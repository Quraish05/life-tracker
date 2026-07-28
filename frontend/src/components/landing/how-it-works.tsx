import { JOURNEY_STEPS } from "@/components/journey/steps";

// Soft per-step tints so the timeline reads as colorful, not uniform.
const TINTS = [
  "bg-lilac/50",
  "bg-blush/50",
  "bg-sky/50",
  "bg-mint/50",
  "bg-peach/60",
];

/** Static "how it works" timeline for the public landing page — the core loop. */
export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 tablet:pt-40">
      <div className="mb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-grape/20 bg-white/70 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-grape shadow-sm">
          The loop
        </span>
        <h2 className="mt-4 text-3xl font-bold tablet:text-4xl">
          How it <span className="font-display italic text-grape">works</span>
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Five steps, from goal to progress.
        </p>
      </div>

      <div className="relative">
        {/* connecting rail behind the nodes (tablet and up) */}
        <div className="pointer-events-none absolute inset-x-[10%] top-9 hidden h-0.5 bg-gradient-to-r from-grape/30 via-coral/40 to-grape/30 tablet:block" />

        <ol className="relative grid grid-cols-1 gap-10 tablet:grid-cols-5 tablet:gap-4">
          {JOURNEY_STEPS.map((step, i) => (
            <li
              key={step.key}
              className="flex flex-col items-center text-center"
            >
              {/* icon tile — ring-cream "cuts" the rail so it reads as a timeline */}
              <div
                className={`flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl text-3xl shadow-lg shadow-grape/10 ring-4 ring-cream transition hover:-translate-y-1 ${TINTS[i]}`}
              >
                {step.icon}
              </div>
              <span className="mt-3 flex h-6 w-6 items-center justify-center rounded-full bg-grape text-xs font-bold text-white shadow-sm">
                {i + 1}
              </span>
              <h3 className="mt-3 font-bold">{step.title}</h3>
              <p className="mt-1 max-w-[15rem] text-sm text-ink-soft">
                {step.blurb}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
