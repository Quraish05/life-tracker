"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

/**
 * Light/dark toggle. Shows the icon for the theme you'd switch *to*, and is
 * styled with semantic tokens so it reads correctly on both plain surfaces
 * and the sidebar's gradient.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-base text-foreground/80 transition hover:bg-grape/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
