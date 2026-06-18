import type { Metadata } from "next";
import { getCheckinByToken, getPublicQueue } from "@/lib/checkin/dal";
import { QueueStatus } from "@/components/checkin/QueueStatus";
import type { CheckinQueueRow, CheckinStatusView } from "@/lib/checkin/types";

export const metadata: Metadata = {
  title: "Your check-in",
  description: "Your live place in the 88 Title check-in queue.",
  // The token is a capability secret — never let this page be indexed.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckinStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let initial: CheckinStatusView | null = null;
  let initialQueue: CheckinQueueRow[] = [];
  try {
    initial = await getCheckinByToken(token);
  } catch {
    // Bad/expired token or queue unreachable — the client view shows a
    // friendly "couldn't find it" state and offers a fresh check-in.
  }
  try {
    initialQueue = await getPublicQueue();
  } catch {
    // board hydrates client-side
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Live status
      </p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
        Your check-in
      </h1>

      <div className="mt-8">
        <QueueStatus
          token={token}
          initial={initial}
          initialQueue={initialQueue}
        />
      </div>
    </div>
  );
}
