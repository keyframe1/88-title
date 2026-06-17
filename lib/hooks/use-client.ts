"use client";

import { useSyncExternalStore } from "react";

/**
 * Small client-only hooks built on useSyncExternalStore. They replace the
 * "setState inside useEffect on mount" pattern (which React 19 flags) for the
 * two things we need: knowing we've hydrated, and reading a client-only value
 * (localStorage, Notification.permission) with a safe server default.
 */

const emptySubscribe = () => () => {};

/**
 * False during SSR and the first client render, true after hydration. Use to
 * gate browser-only UI without a hydration mismatch and without setState-in-effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Read a client-only primitive once, with an SSR default. `read` must return a
 * primitive (so the snapshot is stable across calls).
 */
export function useClientValue<T extends string | number | boolean | null>(
  read: () => T,
  serverDefault: T,
): T {
  return useSyncExternalStore(emptySubscribe, read, () => serverDefault);
}

/**
 * Live network status. Assumes online during SSR (the safe default — we never
 * want to flash an offline state on a connected first paint), then reflects the
 * real value and updates on the browser's online/offline events.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("online", callback);
      window.addEventListener("offline", callback);
      return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
