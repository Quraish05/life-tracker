/** A sidebar navigation entry. */
export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Calendar", href: "/calendar", icon: "📅" },
  { label: "Journal & Notes", href: "/notes", icon: "📓" },
  { label: "Dishes", href: "/dishes", icon: "🍽️" },
  { label: "Goal", href: "/goal", icon: "🎯" },
  { label: "Progress", href: "/progress", icon: "📈" },
  { label: "Reminders", href: "/reminders", icon: "⏰" },
];
