"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useClientValue, useHydrated } from "@/lib/hooks/use-client";

/**
 * Client-side install-prompt plumbing for the PWA.
 *
 * Three concerns, all browser-only:
 *   - capture Chrome/Edge's `beforeinstallprompt` so we can trigger a one-tap
 *     install from our own UI (instead of the dismissable mini-infobar);
 *   - detect iOS (which has no programmatic install — needs manual "Add to Home
 *     Screen") and standalone mode (already installed → never prompt);
 *   - remember a dismissal for the rest of the browser session so a declined
 *     prompt never re-nags.
 *
 * Mirrors the useSyncExternalStore pattern in lib/hooks/use-client.ts so reads
 * are hydration-safe with no setState-in-effect.
 */

/** The non-standard install event Chromium fires; not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

// Capture the event as early as the module loads on the client. It can fire
// before any React component mounts, so this must not wait for a hook.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Suppress the default mini-infobar; we drive install from our own button.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    // Installed — the prompt is spent and no longer offerable.
    deferredPrompt = null;
    notify();
  });
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** True once a native one-tap install is available (Android/desktop Chromium). */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false,
  );
}

/** Already running as an installed app (standalone)? Then never prompt. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS Safari — install is manual (share sheet → Add to Home Screen). */
export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window)
  );
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

/** Trigger the native install prompt. Each captured prompt is single-use. */
export async function promptInstall(): Promise<InstallOutcome> {
  const event = deferredPrompt;
  if (!event) return "unavailable";
  await event.prompt();
  const choice = await event.userChoice;
  deferredPrompt = null;
  notify();
  return choice.outcome;
}

const DISMISS_PREFIX = "88title.pwa.dismissed.";

/**
 * Per-session dismissal, backed by sessionStorage so a declined prompt stays
 * gone for the rest of the visit but can helpfully reappear on a later visit.
 */
export function useDismissed(key: string): {
  dismissed: boolean;
  dismiss: () => void;
} {
  const storageKey = `${DISMISS_PREFIX}${key}`;
  const persisted = useClientValue(() => {
    try {
      return window.sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  }, false);
  const [locallyDismissed, setLocallyDismissed] = useState(false);

  const dismiss = useCallback(() => {
    setLocallyDismissed(true);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // sessionStorage unavailable (private mode, etc.) — dismissal is then
      // only for this render tree, which is still correct for this view.
    }
  }, [storageKey]);

  return { dismissed: persisted || locallyDismissed, dismiss };
}

export interface InstallState {
  /** False during SSR / first client render; gate UI on this. */
  hydrated: boolean;
  /** Running as an installed standalone app. */
  standalone: boolean;
  /** iOS (manual Add-to-Home-Screen path). */
  ios: boolean;
  /** Native one-tap install is available right now. */
  canInstall: boolean;
}

/** One hook for everything an install prompt needs to decide what to render. */
export function useInstallState(): InstallState {
  const hydrated = useHydrated();
  const canInstall = useCanInstall();
  return {
    hydrated,
    standalone: hydrated && isStandalone(),
    ios: hydrated && isIos(),
    canInstall,
  };
}
