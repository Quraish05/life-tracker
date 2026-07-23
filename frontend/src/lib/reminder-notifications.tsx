"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { playReminderChime, unlockReminderSound } from "@/lib/reminder-sound";
import { useAckReminder, useDueReminders } from "@/lib/use-reminders";

/** "unsupported" = the browser has no Notification API at all. */
export type PermissionState = NotificationPermission | "unsupported";

type NotificationsContextValue = {
  permission: PermissionState;
  /** Ask the browser for permission. Must be called from a user gesture. */
  enable: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** The browser's current permission, or "unsupported" (also the SSR value). */
function readPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Read the reminder-notification permission + enabler from anywhere in the app. */
export function useReminderNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useReminderNotifications must be used within <ReminderNotificationsProvider>",
    );
  }
  return ctx;
}

/**
 * Polls for due reminders and fires a browser notification for each, then
 * acknowledges it so it never repeats. Renders nothing itself — mount it once
 * inside the authenticated area and read `useReminderNotifications()` for the
 * permission UI.
 */
export function ReminderNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // The provider only mounts client-side (behind the auth gate), so a lazy
  // initializer reads the real permission without a setState-in-effect.
  const [permission, setPermission] = useState<PermissionState>(readPermission);

  const enable = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // This runs inside the user's click, the one moment autoplay policy lets us
    // prime audio for the later (gesture-less) polling fires.
    unlockReminderSound();
    void Notification.requestPermission().then(setPermission);
  }, []);

  const granted = permission === "granted";
  const { data: due } = useDueReminders({ enabled: granted });

  // IDs we've already surfaced this session, so overlapping polls don't
  // double-fire the same reminder before the ack round-trips.
  const shown = useRef<Set<number>>(new Set());

  // Keep the latest `ack` mutate without making it an effect dependency.
  const ack = useAckReminder();
  const ackRef = useRef(ack.mutate);
  useEffect(() => {
    ackRef.current = ack.mutate;
  });

  useEffect(() => {
    if (!granted || !due) return;
    for (const reminder of due) {
      if (shown.current.has(reminder.id)) continue;
      shown.current.add(reminder.id);

      const notification = new Notification(reminder.title, {
        body: reminder.body ?? undefined,
        tag: `reminder-${reminder.id}`,
      });
      notification.onclick = () => window.focus();
      playReminderChime();

      // Tell the server it's delivered so `/due` stops returning it.
      ackRef.current(reminder.id);
    }
  }, [granted, due]);

  return (
    <NotificationsContext.Provider value={{ permission, enable }}>
      {children}
    </NotificationsContext.Provider>
  );
}
