"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Light/dark theme. The resolved theme lives on `<html data-theme>` — set
 * before paint by the inline script in `layout.tsx` (so there's no flash),
 * and flipped here by the toggle. First visit follows the OS setting; once
 * the user picks a theme it's remembered in localStorage.
 *
 * State is read straight from the DOM via `useSyncExternalStore`, so there's
 * no provider and no effect syncing React to the DOM — the DOM is the source
 * of truth, and components subscribe to changes.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  // Follow OS changes only while the user hasn't chosen explicitly.
  const onSystem = () => {
    if (!localStorage.getItem(STORAGE_KEY)) apply(mq.matches ? "dark" : "light");
  };
  mq.addEventListener("change", onSystem);
  return () => {
    listeners.delete(callback);
    mq.removeEventListener("change", onSystem);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// The inline no-flash script hasn't run on the server; assume light there and
// let useSyncExternalStore reconcile on the client without a hydration error.
function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, toggle, setTheme };
}
