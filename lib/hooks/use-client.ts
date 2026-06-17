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
