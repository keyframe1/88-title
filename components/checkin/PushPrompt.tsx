"use client";

import { useState } from "react";
import {
  pushPermission,
  pushSupported,
  subscribeToPush,
  type PushOutcome,
} from "@/lib/push/subscribe";
import { useHydrated } from "@/lib/hooks/use-client";

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
        <p className="font-display font-extrabold text-ink">
          🔔 Notifications are on
        </p>
        <p className="mt-1 text-sm text-fog">
          We&rsquo;ll ping this device the moment you&rsquo;re up, so you can
          close the page.
        </p>
        {permission === "granted" && outcome === null ? (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="mt-3 text-sm font-semibold text-ink underline-offset-4 hover:text-plate hover:underline disabled:opacity-60"
          >
            {busy ? "Confirming…" : "Re-confirm this device"}
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
          Get notified when you&rsquo;re up
        </p>
        {isIos() && !isStandalone() ? (
          <p className="mt-1 text-sm text-fog">
            On iPhone, tap <span className="font-semibold">Share → Add to Home
            Screen</span>, then open 88 Title from there to enable notifications.
            Until then we&rsquo;ll email you and this page stays live.
          </p>
        ) : (
          <p className="mt-1 text-sm text-fog">
            This browser can&rsquo;t show notifications. No problem: we&rsquo;ll
            email you and keep this page live.
          </p>
        )}
      </div>
    );
  }

  // Blocked.
  if (permission === "denied" || outcome === "denied") {
    return (
      <div className={card}>
        <p className="font-display font-extrabold text-ink">
          Notifications are blocked
        </p>
        <p className="mt-1 text-sm text-fog">
          That&rsquo;s okay. You&rsquo;ll still get an email and this page
          updates live. To turn them on, allow notifications for this site in
          your browser settings.
        </p>
      </div>
    );
  }

  // Default: offer it.
  return (
    <div className={card}>
      <p className="font-display font-extrabold text-ink">
        Get notified when you&rsquo;re up
      </p>
      <p className="mt-1 text-sm text-fog">
        Enable notifications and we&rsquo;ll alert you even if you close this
        page or put your phone away.
      </p>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className="plate-btn mt-4 w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Turning on…" : "Turn on notifications"}
      </button>
      {outcome === "error" ? (
        <p role="alert" className="mt-2 text-sm font-medium text-plate">
          Couldn&rsquo;t turn on notifications. You&rsquo;ll still get email +
          this live page.
        </p>
      ) : null}
    </div>
  );
}
