"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { tokenStore } from "@/lib/api";
import { pushApi, urlBase64ToUint8Array } from "@/lib/push";
import { playReminderChime, unlockReminderSound } from "@/lib/reminder-sound";
import { useAckReminder, useDueReminders } from "@/lib/queries/use-reminders";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Register the service worker, subscribe to Web Push, and hand the
 * subscription to the backend. Idempotent — reuses an existing subscription
 * and re-posts it (the backend upserts by endpoint). No-ops when push isn't
 * configured or supported. Best-effort: callers swallow errors.
 */
async function enablePushSubscription(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const token = tokenStore.get();
  if (token) await pushApi.subscribe(subscription.toJSON(), token);
}

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

  // Once notifications are granted (now, or already on mount), register the
  // service worker and hand a push subscription to the backend so reminders
  // arrive even when this tab is closed. Best-effort — never breaks the app.
  useEffect(() => {
    if (!granted) return;
    enablePushSubscription().catch((err) =>
      console.error("Push subscription failed", err),
    );
  }, [granted]);

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
