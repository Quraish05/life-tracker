/** A sidebar navigation entry. */
export type NavItem = {
  label: string;
  href: string;
  icon: string;
  /** Optional live count badge, resolved by the sidebar (e.g. food total). */
  badge?: "food" | "ingredients";
};

/** A labelled section of the sidebar. */
export type NavGroup = {
  title: string;
  items: NavItem[];
};

/**
 * The sidebar's information architecture, split into two intents: things you
 * do day-to-day ("Track") and things you look back on ("Reflect"). Every entry
 * maps to a real route — global search isn't a route yet, so it's absent here.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Track",
    items: [
      { label: "Today", href: "/dashboard", icon: "🏠" },
      { label: "Calendar", href: "/calendar", icon: "🗓️" },
      { label: "Log an entry", href: "/log", icon: "✨" },
      { label: "Assistant", href: "/chat", icon: "💬" },
      { label: "Food", href: "/food", icon: "🍽️", badge: "food" },
      { label: "Ingredients", href: "/ingredients", icon: "🥕", badge: "ingredients" },
      { label: "Reminders", href: "/reminders", icon: "⏰" },
    ],
  },
  {
    title: "Reflect",
    items: [
      { label: "Journal & Notes", href: "/notes", icon: "📓" },
      { label: "Patterns", href: "/progress", icon: "📈" },
      { label: "Goal", href: "/goal", icon: "🎯" },
    ],
  },
];

/** Flat list of every destination — derived, so old consumers keep working. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * The four primary destinations pinned to the mobile bottom-tab bar. The fifth
 * tab ("More") opens the full nav menu and is rendered by the sidebar itself,
 * so it isn't a route and isn't listed here.
 */
export const MOBILE_TABS: NavItem[] = [
  { label: "Today", href: "/dashboard", icon: "🏠" },
  { label: "Calendar", href: "/calendar", icon: "🗓️" },
  { label: "Food", href: "/food", icon: "🍽️" },
  { label: "Notes", href: "/notes", icon: "📓" },
];
