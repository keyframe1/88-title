"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  parseActiveCheckin,
  readActiveCheckinRaw,
} from "@/lib/checkin/storage";
import { getTransactionPath } from "@/lib/checklists";
import { useClientValue } from "@/lib/hooks/use-client";

/**
 * "Resume your check-in": if this device remembers an active check-in, offer a
 * one-tap jump back to the live status for anyone who closed the tab. Pure
 * convenience over the existing token system — device-local, no account, no
 * server lookup. Renders nothing (and takes no space) when there's nothing
 * stored or storage is unavailable.
 *
 * `className` styles the outer wrapper so each page owns its own placement/
 * spacing while the whole element still collapses cleanly when empty.
 */
export function ReturningBanner({ className }: { className?: string }) {
  // Read the raw string (a stable primitive — safe for useSyncExternalStore),
  // then parse it derived. Returning a fresh object from the reader would loop.
  const raw = useClientValue(readActiveCheckinRaw, null);
  const active = useMemo(() => parseActiveCheckin(raw), [raw]);

  if (!active) return null;

  const serviceLabel =
    getTransactionPath(active.serviceType)?.label ?? "your visit";

  return (
    <div className={className}>
      <Link
        href={`/check-in/status/${active.token}`}
        className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-ink px-4 py-3 text-white transition-colors hover:bg-ink-700"
      >
        <span className="min-w-0">
          <span className="block text-sm font-extrabold">
            You&rsquo;re in line
            {active.ticketCode ? <>, ticket {active.ticketCode}</> : null}
          </span>
          <span className="mt-0.5 block truncate text-sm text-white/70">
            {serviceLabel} · View your live status
          </span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-lg">
          →
        </span>
      </Link>
    </div>
  );
}
