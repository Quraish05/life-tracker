import { AccentText } from "@/components/ui/atoms/accent-text";
import { Card } from "@/components/ui/atoms/card";
import { IconTile } from "@/components/ui/atoms/icon-tile";
import { PageHeader } from "@/components/ui/molecules/page-header";
import { EmptyState } from "@/components/ui/molecules/empty-state";

const STATS = [
  { label: "Habits tracked", value: "0", emoji: "🌱", bg: "bg-mint" },
  { label: "Current streak", value: "0 days", emoji: "🔥", bg: "bg-peach" },
  { label: "Entries this week", value: "0", emoji: "📓", bg: "bg-sky" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 tablet:px-6 tablet:py-10">
      <PageHeader
        className="mb-9"
        eyebrow="Tuesday, July 21"
        title={
          <>
            Your life <AccentText>at a glance</AccentText>
          </>
        }
        subtitle="Welcome back — here's how things are looking today."
      />

      <section className="grid grid-cols-1 gap-5 tablet:grid-cols-3">
        {STATS.map((stat) => (
          <Card
            key={stat.label}
            tone="plain"
            padding="md"
            interactive
            className={stat.bg}
          >
            <IconTile size="md" tone="white">
              {stat.emoji}
            </IconTile>
            <p className="mt-4 text-sm font-medium text-ink/70">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-ink">{stat.value}</p>
          </Card>
        ))}
      </section>

      <EmptyState
        className="mt-8"
        icon="🎈"
        title={
          <>
            Your story <AccentText tone="grape">starts here</AccentText>
          </>
        }
        description="Trackers and insights will bloom on this page as you start using Life Tracker. Menus for each area are on the way."
      />
    </div>
  );
}
