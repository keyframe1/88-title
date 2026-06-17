"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cancelCheckin } from "@/lib/checkin/actions";
import { clearActiveCheckinIfToken } from "@/lib/checkin/storage";
import {
  CHECKIN_STATUS_META,
  estimateWaitMinutes,
  type CheckinQueueRow,
  type CheckinStatusView,
} from "@/lib/checkin/types";
import { getTransactionPath } from "@/lib/checklists";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { LiveQueue } from "./LiveQueue";
import { PushPrompt } from "./PushPrompt";

/**
 * The heart of the queue: a customer's own live status. Position ticks down in
 * realtime (no refresh) and flips to a prominent "You're up!" when staff call
 * them. Reads ONLY the caller's own row, via the token-scoped get_checkin RPC.
 */
export function QueueStatus({
  token,
  initial,
  initialQueue = [],
}: {
  token: string;
  initial: CheckinStatusView | null;
  initialQueue?: CheckinQueueRow[];
}) {
  const [view, setView] = useState<CheckinStatusView | null>(initial);
  const [loaded, setLoaded] = useState(initial !== null);
  const [isPending, startTransition] = useTransition();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const refetch = useCallback(async () => {
    const supabase = supabaseRef.current ?? createClient();
    supabaseRef.current = supabase;
    const { data } = await supabase.rpc("get_checkin", { p_token: token });
    setView(data?.[0] ?? null);
    setLoaded(true);
  }, [token]);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;

    refetch();

    // Any queue change may move our position; refetch our own authoritative row.
    const channel = supabase
      .channel("my-checkin-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins" },
        () => {
          refetch();
        },
      )
      .subscribe();

    // Fallback poll in case realtime is unavailable.
    const interval = window.setInterval(refetch, 20000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [refetch]);

  // Keep this device's resume memory honest with the authoritative record. Once
  // we've loaded, drop the stored entry if this check-in is gone (unknown or
  // expired token) or finished (complete/cancelled — e.g. staff closed it), so
  // the return banner never points at a stale or terminal check-in. Scoped to
  // THIS token, so it won't wipe a newer active check-in.
  const status = view?.status ?? null;
  useEffect(() => {
    if (!loaded) return;
    if (status === null || status === "complete" || status === "cancelled") {
      clearActiveCheckinIfToken(token);
    }
  }, [loaded, status, token]);

  function onCancel() {
    startTransition(async () => {
      await cancelCheckin(token);
      clearActiveCheckinIfToken(token);
      await refetch();
    });
  }

  // Unknown / expired token.
  if (loaded && !view) {
    return (
      <div className="rounded-2xl border-2 border-line bg-mist p-8 text-center">
        <h2 className="font-display text-xl font-extrabold text-ink">
          We couldn&rsquo;t find this check-in
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fog">
          The link may have expired or already been completed. You can check in
          again in a few seconds.
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/check-in" className="plate-btn text-sm">
            Check in
          </Link>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="rounded-2xl border border-line bg-mist/60 p-8 text-center text-fog">
        Loading your status…
      </div>
    );
  }

  const meta = CHECKIN_STATUS_META[view.status];
  const serviceLabel = getTransactionPath(view.service_type)?.label ?? "Visit";

  // ---- You're up -----------------------------------------------------------
  if (view.status === "in_progress") {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border-2 border-plate bg-plate/5 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-plate">
            You&rsquo;re up
          </p>
          <p className="mt-3 font-display text-6xl font-extrabold tracking-wide text-ink">
            {view.ticket_code}
          </p>
          <p className="mt-3 text-lg font-semibold text-ink">
            Head to the counter
          </p>
          <p className="mt-1 text-fog">Show ticket {view.ticket_code} to our staff.</p>
        </div>
      </div>
    );
  }

  // ---- Complete ------------------------------------------------------------
  if (view.status === "complete") {
    return (
      <div className="rounded-3xl border-2 border-ink bg-ink p-8 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          All done
        </p>
        <p className="mt-3 font-display text-3xl font-extrabold">
          Thanks for visiting 88 Title
        </p>
        <p className="mt-2 text-white/70">
          Ticket {view.ticket_code} is complete. Drive safe!
        </p>
      </div>
    );
  }

  // ---- Cancelled -----------------------------------------------------------
  if (view.status === "cancelled") {
    return (
      <div className="rounded-2xl border border-line bg-mist p-8 text-center">
        <h2 className="font-display text-xl font-extrabold text-ink">
          Check-in cancelled
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fog">
          Changed your mind? You can hop back in line anytime.
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/check-in" className="plate-btn text-sm">
            Check in again
          </Link>
        </div>
      </div>
    );
  }

  // ---- Waiting (the live, ticking state) -----------------------------------
  const ahead = view.ahead;
  const youAreNext = view.queue_position <= 1;
  const eta = estimateWaitMinutes(ahead);

  return (
    <div className="flex flex-col gap-6">
      <OfflineBanner />

      <div className="rounded-3xl border-2 border-ink bg-paper p-6 text-center sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          Your ticket · {serviceLabel}
        </p>
        <p className="mt-2 font-display text-5xl font-extrabold tracking-wide text-ink">
          {view.ticket_code}
        </p>

        <div className="mt-6" aria-live="polite">
          {youAreNext ? (
            <p className="font-display text-2xl font-extrabold text-plate">
              You&rsquo;re next!
            </p>
          ) : (
            <>
              <p className="font-display text-4xl font-extrabold text-ink">
                #{view.queue_position} in line
              </p>
              <p className="mt-1 text-fog">
                {ahead} ahead of you · about{" "}
                <span className="font-semibold text-ink">~{eta} min</span>{" "}
                <span className="text-xs">(estimate)</span>
              </p>
            </>
          )}
        </div>

        <p className="mt-4 text-sm text-fog">{meta.description}</p>

        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="mt-5 text-sm font-semibold text-fog underline-offset-4 transition-colors hover:text-plate hover:underline disabled:opacity-60"
        >
          {isPending ? "Cancelling…" : "Cancel my spot"}
        </button>
      </div>

      <PushPrompt token={token} />

      <InstallPrompt placement="status" />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-fog">
          The line right now
        </h2>
        <LiveQueue
          initialRows={initialQueue}
          variant="board"
          highlightTicket={view.ticket_code}
          suppressOfflineBanner
        />
      </div>
    </div>
  );
}
