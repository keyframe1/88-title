"use client";

import Link from "next/link";
import { CHECKIN_TOKEN_KEY } from "@/lib/checkin/storage";
import { useClientValue } from "@/lib/hooks/use-client";

/**
 * If this device already has an active check-in token stashed, offer a one-tap
 * jump back to the live status instead of checking in twice.
 */
export function ReturningBanner() {
  const token = useClientValue(() => {
    try {
      return window.localStorage.getItem(CHECKIN_TOKEN_KEY);
    } catch {
      return null;
    }
  }, null);

  if (!token) return null;

  return (
    <Link
      href={`/check-in/status/${token}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-ink bg-ink px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-700"
    >
      <span>You&rsquo;re already in line. View your live status</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
