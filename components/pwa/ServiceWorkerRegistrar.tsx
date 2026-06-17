"use client";

import { useEffect } from "react";

/**
 * Registers the one service worker (/sw.js) for the whole site, so app-shell
 * caching and installability work for every visitor — not only those who opt
 * into push.
 *
 * This registers the SAME script + scope as lib/push/subscribe.ts. Service
 * worker registration is idempotent per (scriptURL, scope): the browser returns
 * the existing registration rather than creating a second worker, so push and
 * the PWA share one worker and neither overrides the other. Whichever path runs
 * first wins the install; the other just receives the same registration.
 *
 * Mounted once in the root layout. Renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // A registration failure must never break the page. Push + offline
          // simply stay off until a later load succeeds.
        });
    };

    // Register after load so SW setup never competes with first paint.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
