import type { Metadata } from "next";
import Link from "next/link";
import { getPublicQueue } from "@/lib/checkin/dal";
import { CheckInForm } from "@/components/checkin/CheckInForm";
import { LiveQueue } from "@/components/checkin/LiveQueue";
import { ReturningBanner } from "@/components/checkin/ReturningBanner";
import type { CheckinQueueRow } from "@/lib/checkin/types";
import { pageMetadata } from "@/lib/seo";
import { getLocale, getUiText } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, ui] = await Promise.all([getLocale(), getUiText()]);
  return pageMetadata({
    title: ui.meta.checkin.title,
    description: ui.meta.checkin.description,
    path: "/check-in",
    locale,
  });
}

// Reads the live queue per request.
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const ui = await getUiText();

  let initialQueue: CheckinQueueRow[] = [];
  try {
    initialQueue = await getPublicQueue();
  } catch {
    // Queue unavailable (e.g. Supabase not reachable) — the board hydrates
    // client-side and the form still works.
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">{ui.checkin.eyebrow}</p>
      <h1 className="mt-3 h-page">{ui.checkin.heading}</h1>
      <p className="mt-3 max-w-2xl lead">{ui.checkin.intro}</p>

      <ReturningBanner className="mt-6" />

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <section
          aria-labelledby="checkin-form-heading"
          className="lg:col-span-3"
        >
          <div className="rounded-2xl border-2 border-ink bg-white p-6 sm:p-8">
            <h2
              id="checkin-form-heading"
              className="text-lg font-extrabold text-ink"
            >
              {ui.checkin.formHeading}
            </h2>
            <p className="mt-1 mb-5 text-sm leading-relaxed text-fog">
              {ui.checkin.formHint}
            </p>
            <CheckInForm />
          </div>
        </section>

        <aside aria-labelledby="live-queue-heading" className="lg:col-span-2">
          <div className="lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h2
                id="live-queue-heading"
                className="text-sm font-semibold uppercase tracking-[0.18em] text-fog"
              >
                {ui.checkin.lineRightNow}
              </h2>
              <Link
                href="/lobby"
                className="text-xs font-semibold text-ink underline-offset-4 hover:text-plate hover:underline"
              >
                {ui.checkin.lobbyView}
              </Link>
            </div>
            <div className="mt-3">
              <LiveQueue initialRows={initialQueue} variant="board" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
