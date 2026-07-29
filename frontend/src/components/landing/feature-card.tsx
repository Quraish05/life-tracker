import { type Feature } from "@/components/landing/_lib";

/** A single feature tile on the landing page, with a live / coming-soon badge. */
export function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <article className="flex flex-col rounded-3xl border border-border/70 bg-surface/70 p-6 shadow-sm shadow-grape/5 backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-grape/10">
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lilac/40 text-xl">
          {feature.icon}
        </span>
        {feature.status === "live" ? (
          <span className="rounded-full bg-mint/50 px-2.5 py-1 text-xs font-semibold text-ink">
            Available
          </span>
        ) : (
          <span className="rounded-full bg-butter/60 px-2.5 py-1 text-xs font-semibold text-ink/70">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
      <p className="mt-1.5 text-sm text-muted">{feature.description}</p>
    </article>
  );
}
