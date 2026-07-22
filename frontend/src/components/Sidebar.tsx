"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

// Menu items are placeholders for now — real sections come later.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Journal & Notes", href: "/notes", icon: "📓" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const initial = user?.username?.charAt(0).toUpperCase() ?? "U";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-white/60 bg-gradient-to-b from-lilac/70 via-blush/40 to-peach/50">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 rotate-3 items-center justify-center rounded-xl bg-gradient-to-br from-grape to-coral text-sm font-bold text-white shadow-md shadow-grape/30">
          LT
        </div>
        <span className="text-lg font-bold tracking-tight text-ink">
          Life <span className="font-display italic text-grape">Tracker</span>
        </span>
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

        <p className="px-3.5 pt-5 text-xs font-semibold uppercase tracking-wide text-ink-soft/70">
          More menus coming soon
        </p>
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
