# Progressive Web App

88 Title is installable to the home screen and runs standalone, wrapping the
homepage, the check-in queue, and the dealer portal. This is what unlocks **Web
Push on iOS** (Safari only delivers push to home-screen-installed sites) and gives
returning customers and dealers an app-like launch.

The guiding constraint: **the PWA must not break the existing Web Push worker.**
There is exactly one service worker at `public/sw.js`, and it owns both concerns.

## 1. Service worker — one worker, two jobs

`public/sw.js` is the original push worker, extended (not replaced) to also do
app-shell caching. Reconciliation:

- **Push handlers are untouched.** The `push` and `notificationclick` listeners
  are byte-for-byte the originals. The "you're up" notification flow is unchanged.
- **Caching was added alongside** in the same file: `install` precaches the
  offline page, `activate` clears stale caches, and a new `fetch` handler caches
  only build assets.
- **No second worker.** Both [`lib/push/subscribe.ts`](../lib/push/subscribe.ts)
  and [`components/pwa/ServiceWorkerRegistrar.tsx`](../components/pwa/ServiceWorkerRegistrar.tsx)
  call `navigator.serviceWorker.register("/sw.js")` with scope `/`. Registration
  is idempotent per `(scriptURL, scope)` — the browser returns the *same*
  registration, so push and the PWA share one worker and neither unregisters the
  other. The registrar runs on every page (so caching/install work for everyone);
  the push path still registers too, before subscribing.

`next.config.ts` serves `/sw.js` with `Cache-Control: no-cache` so an updated
worker is never masked by HTTP caching.

### What is cached vs. not

PII safety drives the strategy. **No HTML and no dynamic data is ever cached.**

| Request | Strategy | Why |
| --- | --- | --- |
| Navigations (HTML documents) | **Network-first** → offline page on failure | Pages can carry the check-in token, dealer, or staff PII. Never stored; always fresh so realtime data is current. |
| `/_next/static/**` (JS/CSS/fonts) | **Stale-while-revalidate** | Immutable, content-hashed, PII-free. Cached copy is what makes the app open instantly. |
| Offline page + app icons | **Precached** on install | The offline fallback must render with no network. |
| Supabase REST/realtime, cross-origin | **Not intercepted** | Auth and realtime must never be disturbed by the SW. |
| Any non-GET (Server Actions, RPC writes) | **Not intercepted** | Mutations always hit the network. |

Offline behavior for dynamic data is a clean in-page notice (`OfflineBanner`,
driven by `useOnline`), not a broken page — last-known data stays on screen and
live updates resume on reconnect.

## 2. Manifest

[`app/manifest.ts`](../app/manifest.ts) → served at `/manifest.webmanifest`, with
the `<link rel="manifest">` injected automatically by Next.js. `name`/`short_name`
"88 Title", `display: standalone`, `theme_color #14213D`, `background_color
#FAFAF8`, and the existing `/public` icons (`icon-192`/`icon-512` as `any`,
`icon-maskable-512` as `maskable`). iOS standalone title/status-bar come from
`metadata.appleWebApp` in [`app/layout.tsx`](../app/layout.tsx).

## 3. Install prompts — contextual, never a nag

One component, [`InstallPrompt`](../components/pwa/InstallPrompt.tsx), with three
placements. Platform logic lives in [`lib/pwa/install.ts`](../lib/pwa/install.ts).

- **Primary — check-in status page** (`placement="status"`): the moment a
  customer is watching their position. A branded card. On **iOS** it shows manual
  *Share → Add to Home Screen* steps and explains that installing is what turns
  on notifications; on **Android/desktop** it uses the captured
  `beforeinstallprompt` for one-tap install.
- **Secondary — dealer dashboard** (`placement="dealer"`): a subtle dismissible
  row, "Install for quick access and notifications."
- **Quiet — homepage** (`placement="home"`): a slim dismissible hint only. No
  first-visit popup.

**Anti-nag discipline (all placements):**

- Never shown when already running standalone (`isStandalone()`).
- Only rendered when actionable — a native prompt is available *or* it's iOS
  (manual). Otherwise it renders nothing, so there's never a dead button.
- Always dismissible; dismissal is remembered for the session (`sessionStorage`),
  so a declined prompt never re-nags during the visit. Declining the OS install
  dialog is treated as a dismissal too.

## 4. Testing that push still fires after the change

The SW change is additive, but verify end-to-end:

1. Configure VAPID (see [docs/check-in-queue.md](check-in-queue.md) §4) and run
   over HTTPS or `localhost` (`next dev` on localhost is a secure context; for a
   production-like check use `next build && next start`, or `next dev
   --experimental-https`).
2. Open `/check-in`, check in, land on the status page, and "Turn on
   notifications" (the existing `PushPrompt`). Permission should be granted and
   the subscription saved.
3. In DevTools → Application → Service Workers, confirm **one** worker for the
   origin (`/sw.js`, activated). Application → Cache Storage shows `88title-shell-*`
   with only `/_next/static/**` + the precached offline page/icons — **no HTML,
   no Supabase responses**.
4. From the staff console (`/staff/queue`), advance the customer to *in progress*.
   The push notification should appear (tab can be closed); clicking it focuses
   or opens the status page. This exercises the unchanged `push` +
   `notificationclick` handlers.
5. DevTools → Application → Service Workers → "Push" can also send a test payload
   to confirm the handler renders a notification.

Offline check: with the SW active, toggle DevTools → Network → Offline and
navigate — you get the branded `/offline` page, and an open status page shows the
"you're offline" banner rather than breaking.
