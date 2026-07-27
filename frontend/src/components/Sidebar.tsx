"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// Nav links close the drawer via `onNavigate`; logout unmounts the layout —
// so no route-change effect is needed here.

import { useAuth } from "@/lib/auth-context";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

// Menu items are placeholders for now — real sections come later.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Calendar", href: "/calendar", icon: "📅" },
  { label: "Journal & Notes", href: "/notes", icon: "📓" },
  { label: "Dishes", href: "/dishes", icon: "🍽️" },
  { label: "Reminders", href: "/reminders", icon: "⏰" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Mobile/tablet top bar — hidden once the persistent sidebar appears. */}
      <header className="flex items-center justify-between border-b border-white/60 bg-gradient-to-r from-lilac/70 via-blush/40 to-peach/50 px-4 py-3 laptop:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 text-xl text-ink transition hover:bg-white"
        >
          ☰
        </button>
      </header>

      {/* Drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm laptop:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile drawer — slides in from the left. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-200 laptop:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarPanel onNavigate={() => setOpen(false)} />
      </div>

      {/* Persistent sidebar — laptop & desktop only. */}
      <div className="hidden laptop:flex">
        <SidebarPanel />
      </div>
    </>
  );
}

/** Brand lockup, reused in the top bar and the sidebar panel. */
function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-grape to-coral text-sm font-bold text-white shadow-md shadow-grape/30">
        LT
      </div>
      <span className="text-lg font-bold tracking-tight text-ink">
        Life <span className="font-display italic text-grape">Tracker</span>
      </span>
    </div>
  );
}

/** The sidebar's inner content: brand, nav, and the user/logout card. */
function SidebarPanel({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const initial = user?.username?.charAt(0).toUpperCase() ?? "U";

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/60 bg-gradient-to-b from-lilac/70 via-blush/40 to-peach/50 laptop:w-64">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <Brand />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-white text-grape shadow-sm shadow-grape/10"
                  : "text-ink/70 hover:bg-white/60 hover:text-ink"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User / logout */}
      <div className="m-3 rounded-2xl bg-white/60 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky to-mint text-xs font-bold text-ink">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {user?.username ?? "User"}
            </p>
            <p className="truncate text-xs text-ink-soft">
              {user?.email ?? "Signed in"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink/70 transition hover:bg-coral/15 hover:text-coral"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
