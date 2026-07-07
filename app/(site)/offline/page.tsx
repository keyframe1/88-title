import type { Metadata } from "next";
import Link from "next/link";
import { getUiText } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const ui = await getUiText();
  return {
    title: ui.meta.offline.title,
    description: ui.meta.offline.description,
    robots: { index: false, follow: false },
  };
}

/**
 * Offline fallback. Precached by the service worker (public/sw.js) and served
 * for navigations whenever the network is unavailable, so the installed app
 * never shows a broken browser error page. Rendered fully from server HTML (no
 * client JS); the copy follows the locale that was active when it was cached.
 */
export default async function OfflinePage() {
  const ui = await getUiText();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:py-28">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mist font-display text-3xl font-extrabold text-ink"
      >
        88
      </span>
      <p className="mt-6 eyebrow">{ui.offlinePage.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
        {ui.offlinePage.heading}
      </h1>
      <p className="mt-3 leading-relaxed text-fog">{ui.offlinePage.body}</p>
      <Link href="/" className="plate-btn mt-8 text-sm">
        {ui.offlinePage.tryAgain}
      </Link>
      <p className="mt-4 text-sm text-fog">{ui.offlinePage.alreadyCheckedIn}</p>
    </div>
  );
}
