"use client";

import { useState } from "react";
import {
  promptInstall,
  useDismissed,
  useInstallState,
} from "@/lib/pwa/install";
import { useUi } from "@/lib/i18n/client";

/**
 * Contextual "add to home screen" prompt. ONE component, three placements:
 *
 *   - "status" — the primary moment, on the live check-in status page. A full,
 *     branded card that ties installing to push ("we'll notify you when you're
 *     up"). On iOS this is the only way to enable push, so the copy says so.
 *   - "dealer" — a subtle, dismissible suggestion on the dealer dashboard.
 *   - "home"   — a quiet, dismissible hint. Never an interruptive popup.
 *
 * The dealer dashboard sits outside the customer i18n provider, so useUi() there
 * returns the base (English) copy — correct for that internal surface.
 *
 * Discipline (all placements):
 *   - never shown when already running standalone (installed);
 *   - always dismissible, and dismissal is remembered for the session;
 *   - only shown when it can actually do something — a native one-tap install
 *     (Android/desktop) or iOS manual instructions. Otherwise it renders null,
 *     so there's never a dead button.
 */

type Placement = "status" | "dealer" | "home";

function ShareIcon({ className = "" }: { className?: string }) {
  // iOS share glyph (box with up arrow), so the instruction is unmistakable.
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}

function DismissButton({
  onClick,
  label,
  className = "",
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`shrink-0 rounded-md p-1 text-fog transition-colors hover:text-ink focus-visible:text-ink ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

export function InstallPrompt({ placement }: { placement: Placement }) {
  const ui = useUi();
  const { hydrated, standalone, ios, canInstall } = useInstallState();
  const { dismissed, dismiss } = useDismissed(placement);
  const [installing, setInstalling] = useState(false);

  // Suppress until we know enough on the client, when installed, or when
  // dismissed this session. Only iOS (manual) or a native prompt is actionable.
  if (!hydrated || standalone || dismissed) return null;
  const actionable = canInstall || ios;
  if (!actionable) return null;

  async function onInstall() {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    // Declining the OS dialog spends the prompt; honor that as a dismissal so we
    // don't leave a now-dead button. (Accepting fires appinstalled → unmounts.)
    if (outcome !== "accepted") dismiss();
  }

  const iosSteps = (
    <span>
      {ui.install.iosTap}{" "}
      <ShareIcon className="-mt-0.5 inline-block h-4 w-4 align-middle text-ink" />{" "}
      <span className="font-semibold text-ink">{ui.install.iosShare}</span>
      {ui.install.iosThen}
      <span className="font-semibold text-ink">{ui.install.iosAdd}</span>.
    </span>
  );

  // ---- Primary: live status page ------------------------------------------
  if (placement === "status") {
    return (
      <div className="relative rounded-2xl border-2 border-ink bg-paper p-5 sm:p-6">
        <DismissButton
          onClick={dismiss}
          label={ui.install.dismiss}
          className="absolute right-3 top-3"
        />
        <p className="pr-6 font-display text-lg font-extrabold text-ink">
          {ui.install.statusTitle}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-fog">
          {ios ? ui.install.statusBodyIos : ui.install.statusBodyOther}
        </p>
        {ios ? (
          <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm text-fog">
            {iosSteps}
          </p>
        ) : (
          <button
            type="button"
            onClick={onInstall}
            disabled={installing}
            className="plate-btn mt-4 w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {installing ? ui.install.opening : ui.install.statusButton}
          </button>
        )}
      </div>
    );
  }

  // ---- Secondary: dealer dashboard ----------------------------------------
  if (placement === "dealer") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-mist px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {ui.install.dealerTitle}
          </p>
          <p className="mt-0.5 text-sm text-fog">
            {ios ? iosSteps : ui.install.dealerBodyOther}
          </p>
        </div>
        {!ios ? (
          <button
            type="button"
            onClick={onInstall}
            disabled={installing}
            className="shrink-0 rounded-lg border border-ink px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white disabled:opacity-60"
          >
            {installing ? ui.install.opening : ui.install.install}
          </button>
        ) : null}
        <DismissButton onClick={dismiss} label={ui.install.dismiss} />
      </div>
    );
  }

  // ---- Quiet: homepage hint ------------------------------------------------
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm">
      <span className="min-w-0 flex-1 text-fog">
        {ios ? (
          <>
            {ui.install.homeBodyIosPrefix}
            {iosSteps}
          </>
        ) : (
          ui.install.homeBodyOther
        )}
      </span>
      {!ios ? (
        <button
          type="button"
          onClick={onInstall}
          disabled={installing}
          className="shrink-0 font-semibold text-ink underline-offset-4 hover:text-plate hover:underline disabled:opacity-60"
        >
          {installing ? ui.install.opening : ui.install.install}
        </button>
      ) : null}
      <DismissButton onClick={dismiss} label={ui.install.dismiss} />
    </div>
  );
}
