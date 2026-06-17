import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're offline",
  description: "88 Title needs a connection for the live queue.",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback. Precached by the service worker (public/sw.js) and served
 * for navigations whenever the network is unavailable, so the installed app
 * never shows a broken browser error page. Kept fully static and meaningful
 * from server HTML alone — it must render without any client JS.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:py-28">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mist font-display text-3xl font-extrabold text-ink"
      >
        88
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        You&rsquo;re offline
      </p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
        We need a connection
      </h1>
      <p className="mt-3 leading-relaxed text-fog">
        The live line and your check-in status update in real time, so they need
        the internet. Reconnect and you&rsquo;ll pick up right where you left off.
      </p>
      <Link href="/" className="plate-btn mt-8 text-sm">
        Try again
      </Link>
      <p className="mt-4 text-sm text-fog">
        Already checked in? We&rsquo;ll still notify you when you&rsquo;re up.
      </p>
    </div>
  );
}
