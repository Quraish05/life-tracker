const STATS = [
  { label: "Habits tracked", value: "0", emoji: "🌱", bg: "bg-mint" },
  { label: "Current streak", value: "0 days", emoji: "🔥", bg: "bg-peach" },
  { label: "Entries this week", value: "0", emoji: "📓", bg: "bg-sky" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-9">
        <p className="text-sm font-semibold text-grape">Tuesday, July 21</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-ink">
          Your life{" "}
          <span className="font-display italic text-coral">at a glance</span>
        </h1>
        <p className="mt-2 text-base text-ink-soft">
          Welcome back — here&apos;s how things are looking today.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-3xl p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-xl">
              {stat.emoji}
            </div>
            <p className="mt-4 text-sm font-medium text-ink/70">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-ink">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 flex flex-col items-center rounded-3xl border-2 border-dashed border-grape/25 bg-white/60 p-12 text-center backdrop-blur-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-butter text-3xl shadow-sm">
          🎈
        </div>
        <h2 className="mt-5 text-xl font-bold text-ink">
          Your story <span className="font-display italic text-grape">starts here</span>
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Trackers and insights will bloom on this page as you start using Life
          Tracker. Menus for each area are on the way.
        </p>
      </section>
    </div>
  );
}
