/*
 * 88 Title service worker.
 *
 * This worker owns TWO concerns that share one registration (scope: site root):
 *
 *   1. Web Push for the check-in queue (the ORIGINAL job) — `push` +
 *      `notificationclick`. These power the "you're up" notification while the
 *      tab is closed/backgrounded and MUST keep working unchanged.
 *   2. PWA app-shell caching (added with PWA support) — `install` precache,
 *      `activate` cleanup, and a conservative `fetch` strategy so the installed
 *      app opens instantly and degrades to a clean offline page.
 *
 * Reconciliation: there is exactly ONE service worker at /sw.js. The PWA work
 * was added ALONGSIDE the push handlers in this same file — no second worker is
 * registered, and the push/notificationclick handlers below are byte-for-byte
 * the originals. lib/push/subscribe.ts and the site-wide registrar both call
 * navigator.serviceWorker.register("/sw.js"), which is idempotent for one scope,
 * so registering for push and registering for the PWA resolve to this worker.
 *
 * Caching is deliberately PII-safe: HTML documents (which may carry the check-in
 * token, dealer, or staff data) are NEVER cached — navigations are network-first
 * with an offline-page fallback. Only PII-free build assets are cached.
 *
 * A push payload is JSON: { title, body, url, tag }. We show a notification and,
 * on click, focus an existing tab for that URL or open a new one.
 */

// Bump the version to invalidate the old shell cache on the next activate.
// v2: the drawn 88 monogram replaced the text-in-a-box icons.
const CACHE_NAME = "88title-shell-v2";

// The offline fallback page (a static, JS-optional route) plus a couple of
// brand assets it leans on. Precached so the offline state always renders.
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  // Precache the offline shell. allSettled so one missing asset can't abort the
  // install (the offline page is the only one that truly matters).
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))),
  );
  // Activate this worker immediately rather than waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop any shell caches from a previous version.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("88title-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// Only same-origin build assets are cacheable. Everything else is left to the
// network: HTML documents (PII), Supabase REST/realtime (cross-origin), API
// routes, and any non-GET request.
function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")
  );
}

// Stale-while-revalidate: serve the cached copy instantly, refresh in the
// background. Cache keys include the query string, so dev/HMR chunk variants
// never serve stale across builds.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await networkFetch) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept writes (Server Actions, RPC mutations) or non-GET methods.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin (Supabase auth, REST, realtime, fonts CDN, …) passes straight
  // through — caching or rewriting these would risk breaking auth/realtime.
  if (url.origin !== self.location.origin) return;

  // App-shell navigations: network-first so live queue/dealer data is always
  // fresh and no HTML (which may hold PII) is ever stored. Offline → the
  // precached offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match(OFFLINE_URL, { ignoreSearch: true });
        return offline || Response.error();
      }),
    );
    return;
  }

  // Immutable build assets (JS/CSS/fonts under /_next/static): cache-first via
  // SWR. This is what makes the installed app open instantly.
  if (isCacheableAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Anything else: do not intercept — default browser/network behavior.
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
