import { request } from "@/lib/api";

/**
 * Web Push subscription client — talks to the backend `/push` routes.
 * The browser's `PushSubscription.toJSON()` (endpoint + keys) is posted as-is;
 * the backend ignores the extra `expirationTime` field.
 */
export const pushApi = {
  subscribe: (subscription: PushSubscriptionJSON, token: string) =>
    request<{ id: number; endpoint: string }>("/push/subscribe", {
      method: "POST",
      body: subscription,
      token,
    }),

  unsubscribe: (endpoint: string, token: string) =>
    request<void>("/push/subscribe", {
      method: "DELETE",
      body: { endpoint },
      token,
    }),
};

/**
 * Convert a base64url VAPID key (as the server stores it) into the
 * `Uint8Array` that `pushManager.subscribe`'s `applicationServerKey` wants.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
