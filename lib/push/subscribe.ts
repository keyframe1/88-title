/**
 * Browser-side Web Push subscription helper (client only).
 *
 * Registers the service worker, asks for notification permission, subscribes to
 * push with the app's VAPID public key, and hands the subscription to the server
 * action that stores it against the customer's check-in row. Everything degrades
 * gracefully: callers fall back to email + the live page when push is
 * unsupported, denied, or not configured.
 */
import { savePushSubscription } from "@/lib/checkin/actions";
import type { PushSubscriptionJSON } from "@/lib/checkin/types";

export type PushOutcome =
  | "subscribed"
  | "denied"
  | "unsupported"
  | "not-configured"
  | "error";

/** True when this browser can do Web Push at all. */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Current notification permission, or "unsupported". */
export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Prompt for permission and subscribe `sessionToken`'s check-in to push.
 * Idempotent: reuses an existing subscription if present.
 */
export async function subscribeToPush(
  sessionToken: string,
): Promise<PushOutcome> {
  if (!pushSupported()) return "unsupported";

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return "not-configured";

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return "error";
    }

    const payload: PushSubscriptionJSON = {
      endpoint: json.endpoint,
      expirationTime: json.expirationTime ?? null,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    };

    const result = await savePushSubscription(sessionToken, payload);
    return result.ok ? "subscribed" : "error";
  } catch {
    return "error";
  }
}
