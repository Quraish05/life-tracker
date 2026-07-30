"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useFoods } from "@/lib/use-food";
import { cn } from "@/lib/utils";
import { AiQuotaBadge } from "@/components/ai/ai-quota";
import { ThemeToggle } from "@/components/ui/atoms/theme-toggle";
import {
  MOBILE_TABS,
  NAV_GROUPS,
  NAV_ITEMS,
  type NavItem,
} from "@/constants/navigation";

/**
 * Rail collapsed/expanded state, persisted in localStorage. Modelled on the
 * theme store: the value is an external source of truth read through
 * `useSyncExternalStore`, so there's no setState-in-effect. The server (and the
 * first hydrating render) assumes expanded; the stored value is read on the
 * first client snapshot, so a collapsed rail resolves right after hydration.
 */
const RAIL_KEY = "sidebar-rail";
const railListeners = new Set<() => void>();
let railCollapsed = false;
let railHydrated = false;

function railSubscribe(callback: () => void) {
  railListeners.add(callback);
  return () => railListeners.delete(callback);
}

function railGetSnapshot() {
  if (!railHydrated && typeof window !== "undefined") {
    railCollapsed = localStorage.getItem(RAIL_KEY) === "collapsed";
    railHydrated = true;
  }
  return railCollapsed;
}

function railGetServerSnapshot() {
  return false;
}

function setRailCollapsed(next: boolean) {
  railCollapsed = next;
  railHydrated = true;
  if (typeof window !== "undefined") {
    localStorage.setItem(RAIL_KEY, next ? "collapsed" : "expanded");
  }
  for (const l of railListeners) l();
}

function useRail() {
  const collapsed = useSyncExternalStore(
    railSubscribe,
    railGetSnapshot,
    railGetServerSnapshot,
  );
  const toggle = useCallback(() => setRailCollapsed(!railGetSnapshot()), []);
  return { collapsed, toggle };
}

/** True when the current path is at, or under, this destination. */
function useActiveMatcher() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolves a nav item's live badge (e.g. the food count) to a label. */
function useBadges(): Record<NonNullable<NavItem["badge"]>, string> {
  const { data: foods = [] } = useFoods();
  return { food: foods.length ? String(foods.length) : "" };
}

export default function Sidebar() {
  return (
    <>
      <DesktopRail />
      <MobileNav />
    </>
  );
}

/** Square brand chip — the accent-filled "LT" mark from the redesign. */
function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-md bg-grape font-bold text-on-accent"
      style={{ height: size, width: size, fontSize: size <= 30 ? 11 : 12 }}
    >
      LT
    </div>
  );
}

/** Round gradient avatar with the user's initial. */
function Avatar({ initial, size = 30 }: { initial: string; size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full bg-gradient-to-br from-sky to-mint font-bold text-ink"
      style={{ height: size, width: size, fontSize: size <= 32 ? 11 : 13 }}
    >
      {initial}
    </div>
  );
}

/* ── Desktop: persistent, collapsible rail (laptop and up) ─────────────── */

function DesktopRail() {
  const { collapsed, toggle: toggleRail } = useRail();
  const isActive = useActiveMatcher();
  const badges = useBadges();

  if (collapsed) {
    return (
      <aside className="hidden h-full w-[76px] shrink-0 flex-col items-center gap-1.5 border-r border-border/60 bg-surface px-0 pt-4 pb-4 laptop:flex">
        <BrandMark size={32} />
        <button
          type="button"
          onClick={toggleRail}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="my-1.5 flex h-6 w-6 items-center justify-center rounded-md border border-border text-xs text-muted transition hover:bg-grape/10 hover:text-grape-deep"
        >
          »
        </button>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg text-[17px] transition",
                active
                  ? "bg-grape/10 text-foreground"
                  : "text-foreground/70 hover:bg-grape/8",
              )}
            >
              {item.icon}
            </Link>
          );
        })}
        <div className="flex-1" />
        <ThemeToggle />
      </aside>
    );
  }

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border/60 bg-surface laptop:flex">
      {/* Brand + collapse toggle */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-3">
        <BrandMark />
        <Link
          href="/dashboard"
          className="min-w-0 flex-1 truncate text-[15px] font-bold text-foreground transition hover:opacity-80"
        >
          Life <span className="font-display italic text-grape">Tracker</span>
        </Link>
        <button
          type="button"
          onClick={toggleRail}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md border border-border text-xs text-muted transition hover:bg-grape/10 hover:text-grape-deep"
        >
          «
        </button>
      </div>

      {/* Grouped navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mt-4 mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              {group.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <RailLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  badge={item.badge ? badges[item.badge] : ""}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <UserCard />
    </aside>
  );
}

/** A single expanded-rail nav row: left accent mark, icon, label, badge. */
function RailLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition",
        active
          ? "bg-grape/10 font-bold text-foreground"
          : "font-semibold text-foreground/70 hover:bg-grape/8 hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2.5 left-0 w-0.5 rounded-full",
          active ? "bg-grape" : "bg-transparent",
        )}
      />
      <span className="text-[15px]">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {badge ? (
        <span className="text-xs font-semibold text-muted">{badge}</span>
      ) : null}
    </Link>
  );
}

/** Bottom-of-rail user card: identity, AI quota, theme, sign out. */
function UserCard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const initial = user?.username?.charAt(0).toUpperCase() ?? "U";

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="mt-auto border-t border-border/60 px-3 py-3">
      <div className="flex items-center gap-2.5 px-1">
        <Avatar initial={initial} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground">
            {user?.username ?? "User"}
          </p>
          <p className="truncate text-[11px] text-muted">
            {user?.email ?? "Signed in"}
          </p>
        </div>
        <ThemeToggle />
      </div>
      <AiQuotaBadge className="mt-2 w-full justify-center" />
      <button
        type="button"
        onClick={handleLogout}
        className="mt-1.5 w-full rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-foreground/70 transition hover:bg-coral/15 hover:text-coral"
      >
        Sign out
      </button>
    </div>
  );
}

/* ── Mobile / tablet: bottom-tab bar + full-screen slide-up menu ───────── */

function MobileNav() {
  const [open, setOpen] = useState(false);
  const isActive = useActiveMatcher();

  // Close the menu on Escape while it's open.
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
      {/* Fixed bottom-tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border/60 bg-background px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),1.25rem)] laptop:hidden">
        {MOBILE_TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-h-11 min-w-14 flex-col items-center gap-0.5 text-[10px] font-bold transition",
                active ? "text-grape" : "text-muted hover:text-foreground",
              )}
            >
              <span className="text-[17px]">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className={cn(
            "flex min-h-11 min-w-14 flex-col items-center gap-0.5 text-[10px] font-bold transition",
            open ? "text-grape" : "text-muted hover:text-foreground",
          )}
        >
          <span className="text-[17px]">⋯</span>
          More
        </button>
      </nav>

      {open && <SlideUpMenu onClose={() => setOpen(false)} />}
    </>
  );
}

/** Full-screen grouped nav + user controls, opened from the "More" tab. */
function SlideUpMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const isActive = useActiveMatcher();
  const badges = useBadges();
  const { user, logout } = useAuth();
  const initial = user?.username?.charAt(0).toUpperCase() ?? "U";

  function handleLogout() {
    onClose();
    logout();
    router.replace("/login");
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-rise-in flex-col bg-background px-5 pt-5 pb-6 laptop:hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <BrandMark size={34} />
          <span className="text-base font-bold text-foreground">
            Life <span className="font-display italic text-grape">Tracker</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-[15px] text-foreground transition hover:bg-grape/10"
        >
          ✕
        </button>
      </div>

      {/* Grouped destinations */}
      <div className="flex-1 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mt-5 mb-2.5 px-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              {group.title}
            </p>
            <div className="flex flex-col gap-1.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const badge = item.badge ? badges[item.badge] : "";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex min-h-14 items-center gap-3.5 rounded-xl border px-4 py-3.5 text-base transition",
                      active
                        ? "border-grape/30 bg-grape/10 font-bold text-foreground"
                        : "border-border font-semibold text-foreground/80 hover:bg-grape/8",
                    )}
                  >
                    <span className="text-[19px]">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {badge ? (
                      <span className="text-xs font-semibold text-muted">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: identity + theme + sign out */}
      <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-4">
        <Avatar initial={initial} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {user?.username ?? "User"}
          </p>
          <p className="truncate text-xs text-muted">
            {user?.email ?? "Signed in"}
          </p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-border px-4 py-2.5 text-[13px] font-semibold text-foreground/80 transition hover:bg-coral/15 hover:text-coral"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
