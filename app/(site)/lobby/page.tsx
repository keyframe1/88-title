import type { Metadata } from "next";
import { getPublicQueue } from "@/lib/checkin/dal";
import { LiveQueue } from "@/components/checkin/LiveQueue";
import type { CheckinQueueRow } from "@/lib/checkin/types";
import { getUiText } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const ui = await getUiText();
  return {
    title: ui.meta.lobby.title,
    description: ui.meta.lobby.description,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

/**
 * Big, glanceable queue board for a lobby screen / TV. Anonymized (ticket codes
 * only) and realtime. No PII ever reaches this view.
 */
export default async function LobbyPage() {
  const ui = await getUiText();

  let initialQueue: CheckinQueueRow[] = [];
  try {
    initialQueue = await getPublicQueue();
  } catch {
    // board hydrates client-side
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-plate">
            88 Title
          </p>
          <h1 className="mt-1 text-4xl font-extrabold sm:text-5xl">
            {ui.lobby.heading}
          </h1>
        </div>
        <span className="hidden items-center gap-2 text-sm font-medium text-fog sm:inline-flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-plate" aria-hidden="true" />
          {ui.lobby.updatesAuto}
        </span>
      </header>

      <LiveQueue initialRows={initialQueue} variant="lobby" />
    </div>
  );
}
