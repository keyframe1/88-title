import type { Metadata } from "next";
import Link from "next/link";
import { getPublicQueue } from "@/lib/checkin/dal";
import { CheckInForm } from "@/components/checkin/CheckInForm";
import { LiveQueue } from "@/components/checkin/LiveQueue";
import { ReturningBanner } from "@/components/checkin/ReturningBanner";
import type { CheckinQueueRow } from "@/lib/checkin/types";

export const metadata: Metadata = {
  title: "Check in",
  description:
    "Check in online for 88 Title in Metairie. Grab your spot in the live queue from your phone and we'll notify you the moment you're up.",
};

// Reads the live queue per request.
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  let initialQueue: CheckinQueueRow[] = [];
  try {
    initialQueue = await getPublicQueue();
  } catch {
    // Queue unavailable (e.g. Supabase not reachable) — the board hydrates
    // client-side and the form still works.
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Check in
      </p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">
        Check in online
      </h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-fog">
        Grab your spot from your phone and watch the line move in real time.
        We&rsquo;ll notify you the moment you&rsquo;re up, so there&rsquo;s no
        need to wait on your feet.
      </p>

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
              Tell us who you are
            </h2>
            <p className="mt-1 mb-5 text-sm leading-relaxed text-fog">
              Three quick fields and you&rsquo;re in line.
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
                The line right now
              </h2>
              <Link
                href="/lobby"
                className="text-xs font-semibold text-ink underline-offset-4 hover:text-plate hover:underline"
              >
                Lobby view →
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
