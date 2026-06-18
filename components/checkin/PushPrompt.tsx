"use client";

import { useState } from "react";
import {
  pushPermission,
  pushSupported,
  subscribeToPush,
  type PushOutcome,
} from "@/lib/push/subscribe";
import { useHydrated } from "@/lib/hooks/use-client";
import { useUi } from "@/lib/i18n/client";

/**
 * Opt-in browser-push prompt — the SMS alternative. Lets the customer get a real
 * notification when they're up, even with the tab closed. Everything degrades
 * gracefully: if push isn't configured, unsupported, or denied, this renders a
 * quiet fallback (or nothing) and the customer still has email + the live page.
 */
function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const card = "rounded-2xl border border-line bg-mist/70 p-5";

export function PushPrompt({ token }: { token: string }) {
  const ui = useUi();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<PushOutcome | null>(null);

  // Push isn't configured in this environment → don't tease a feature we can't
  // deliver. Gate on hydration so we never mismatch SSR (which renders nothing).
  const configured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  if (!hydrated || !configured) return null;

  // Safe to read browser state directly now that we've hydrated (client only).
  const permission = pushPermission();
  const supported = pushSupported();

  async function enable() {
    setBusy(true);
    setOutcome(await subscribeToPush(token));
    setBusy(false);
  }

  // Success.
  if (outcome === "subscribed" || (permission === "granted" && outcome === null)) {
    return (
      <div className={card}>
        <p className="font-display font-extrabold text-ink">{ui.push.onTitle}</p>
        <p className="mt-1 text-sm text-fog">{ui.push.onBody}</p>
        {permission === "granted" && outcome === null ? (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="mt-3 text-sm font-semibold text-ink underline-offset-4 hover:text-plate hover:underline disabled:opacity-60"
          >
            {busy ? ui.push.reconfirming : ui.push.reconfirm}
          </button>
        ) : null}
      </div>
    );
  }

  // Unsupported browser (incl. iOS Safari that isn't installed to Home Screen).
  if (!supported) {
    return (
      <div className={card}>
        <p className="font-display font-extrabold text-ink">
          {ui.push.getNotifiedTitle}
        </p>
        {isIos() && !isStandalone() ? (
          <p className="mt-1 text-sm text-fog">
            {ui.push.iosBefore}
            <span className="font-semibold">{ui.push.iosAction}</span>
            {ui.push.iosAfter}
          </p>
        ) : (
          <p className="mt-1 text-sm text-fog">{ui.push.unsupportedBody}</p>
        )}
      </div>
    );
  }

  // Blocked.
  if (permission === "denied" || outcome === "denied") {
    return (
      <div className={card}>
        <p className="font-display font-extrabold text-ink">
          {ui.push.blockedTitle}
        </p>
        <p className="mt-1 text-sm text-fog">{ui.push.blockedBody}</p>
      </div>
    );
  }

  // Default: offer it.
  return (
    <div className={card}>
      <p className="font-display font-extrabold text-ink">
        {ui.push.getNotifiedTitle}
      </p>
      <p className="mt-1 text-sm text-fog">{ui.push.offerBody}</p>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className="plate-btn mt-4 w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? ui.push.turningOn : ui.push.turnOn}
      </button>
      {outcome === "error" ? (
        <p role="alert" className="mt-2 text-sm font-medium text-plate">
          {ui.push.error}
        </p>
      ) : null}
    </div>
  );
}
