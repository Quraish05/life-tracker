/**
 * Life Tracker service worker — background Web Push delivery.
 *
 * Receives pushes sent by the backend reminder dispatcher and shows a
 * notification even when the app's tab is closed or another app is focused.
 * Payload shape (see backend `services/reminder_dispatch.py`):
 *   { title, body, reminderId, url }
 */

self.addEventListener("install", () => {
  // Activate this worker immediately rather than waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data && event.data.text() };
  }

  const title = data.title || "Reminder";
  const options = {
    body: data.body || undefined,
    // Collapse repeat pushes for the same reminder into one notification.
    tag: data.reminderId ? `reminder-${data.reminderId}` : undefined,
    data: { url: data.url || "/reminders" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/reminders";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an existing tab if one is open, navigating it to the target.
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Cross-origin or detached; ignore and keep focus.
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
    })(),
  );
});
