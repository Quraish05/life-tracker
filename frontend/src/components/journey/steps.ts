// The core Life Tracker loop, shared by the landing "how it works" strip
// (static) and the dashboard journey map (state-aware).

export type JourneyStep = {
  key: string;
  icon: string;
  title: string;
  blurb: string;
  href: string;
};

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    key: "goal",
    icon: "🎯",
    title: "Set your goal",
    blurb: "Lose weight, gain muscle, or just stay on track.",
    href: "/goal",
  },
  {
    key: "foods",
    icon: "🍽️",
    title: "Build your food",
    blurb: "Save the meals you eat, with recipes and ingredients.",
    href: "/food",
  },
  {
    key: "log",
    icon: "📅",
    title: "Log your day",
    blurb: "Add meals and workouts on the calendar.",
    href: "/calendar",
  },
  {
    key: "summarize",
    icon: "✨",
    title: "Get an AI summary",
    blurb: "See calories in vs out and if you're on track.",
    href: "/calendar",
  },
  {
    key: "progress",
    icon: "📈",
    title: "Track progress",
    blurb: "Save summaries and watch your week take shape.",
    href: "/progress",
  },
];
