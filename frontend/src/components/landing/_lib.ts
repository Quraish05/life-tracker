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
    icon: "🍽️",
    title: "Meals & food",
    description:
      "Build a library of the food you eat — recipes and ingredients — and log them against each day.",
    status: "live",
  },
  {
    icon: "📅",
    title: "Calendar",
    description:
      "Log meals and workouts on a day, and see your whole month of activity at a glance.",
    status: "live",
  },
  {
    icon: "✨",
    title: "AI insights",
    description:
      "An AI summary of each day's calories in vs out, whether you're on track for your goal, and a quick tip.",
    status: "live",
  },
  {
    icon: "🎯",
    title: "Goals & progress",
    description:
      "Set a health goal, save your daily summaries, and watch your week and month take shape.",
    status: "live",
  },
  {
    icon: "⏰",
    title: "Reminders",
    description:
      "Gentle nudges delivered as browser push notifications, so nothing slips.",
    status: "live",
  },
];
