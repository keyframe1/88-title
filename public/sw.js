/*
 * 88 Title service worker — Web Push for the check-in queue.
 *
 * Served statically from /sw.js (scope: site root) so it can receive pushes
 * while the tab is closed or backgrounded. Kept tiny and dependency-free.
 *
 * A push payload is JSON: { title, body, url, tag }. We show a notification and,
 * on click, focus an existing tab for that URL or open a new one.
 */

self.addEventListener("install", (event) => {
  // Activate this worker immediately rather than waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = {
      title: "88 Title",
      body: event.data ? event.data.text() : "Your check-in was updated.",
    };
  }

  const title = payload.title || "88 Title";
  const url = payload.url || "/";
  const options = {
    body: payload.body || "",
    tag: payload.tag || "checkin-status",
    renotify: true,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url },
    // Keep it on screen until acknowledged — this is the "you're up" moment.
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          // Focus an already-open status tab if we can find one.
          if ("focus" in client && client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
