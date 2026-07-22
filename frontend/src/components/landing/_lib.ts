// Landing-page content data.

export type Feature = {
  icon: string;
  title: string;
  description: string;
  status: "live" | "soon";
};

export const FEATURES: Feature[] = [
  {
    icon: "📓",
    title: "Journal & Notes",
    description:
      "Write daily entries in markdown, tag your moods, and pin what matters. A calm space for your thoughts.",
    status: "live",
  },
  {
    icon: "🏠",
    title: "Dashboard",
    description:
      "A friendly home base that pulls your day together at a glance.",
    status: "live",
  },
  {
    icon: "✅",
    title: "Habits",
    description:
      "Build streaks and track the little routines that add up over time.",
    status: "soon",
  },
  {
    icon: "📈",
    title: "Mood trends",
    description:
      "See how you've been feeling across weeks and months, beautifully.",
    status: "soon",
  },
  {
    icon: "🎯",
    title: "Goals & milestones",
    description: "Set intentions, celebrate wins, and watch your progress grow.",
    status: "soon",
  },
  {
    icon: "✨",
    title: "…and more",
    description:
      "Life Tracker is just getting started. New features land regularly.",
    status: "soon",
  },
];
