"use client";

import { useState, type ReactNode } from "react";
import { useClientValue } from "@/lib/hooks/use-client";

/**
 * Collapsible wrapper for the staff OMV reference section (client).
 *
 * The whole section is a disclosure: a compact summary row (eyebrow + title +
 * chevron) that expands to the code grid. Open/closed persists in localStorage,
 * so a clerk's choice sticks across visits. The DEFAULT (used only when there is
 * no stored choice) is passed in as `defaultOpen`: collapsed while the codes are
 * all blank, open once any real code is configured. The grid content stays
 * mounted and is toggled with `hidden`, so there is no hydration mismatch (the
 * server renders with the same default) and no re-render churn on toggle.
 */
const STORAGE_KEY = "88title.staff.omvReferenceOpen";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function OmvReferenceDisclosure({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: ReactNode;
}) {
  // The stored preference ("1" / "0"), read across the hydration boundary via
  // useSyncExternalStore (no setState-in-effect). null = never chosen, so the
  // default applies. An in-session toggle overrides both.
  const storedRaw = useClientValue<string | null>(readStored, null);
  const [override, setOverride] = useState<boolean | null>(null);

  const storedPref = storedRaw === null ? null : storedRaw === "1";
  const open = override ?? storedPref ?? defaultOpen;

  function toggle() {
    const next = !open;
    setOverride(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Storage disabled / private mode: the in-session override still applies.
    }
  }

  const contentId = "omv-reference-content";
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left transition-colors hover:border-ink"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-plate">
            Counter reference
          </span>
          <span className="mt-0.5 block font-display text-base font-extrabold text-ink">
            OMV reference codes
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-fog transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={contentId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
