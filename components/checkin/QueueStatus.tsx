"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cancelCheckin, markArrivedByToken } from "@/lib/checkin/actions";
import { clearActiveCheckinIfToken } from "@/lib/checkin/storage";
import type {
  CheckinQueueRow,
  CheckinStatusView,
} from "@/lib/checkin/types";
import { useLocale, useUi } from "@/lib/i18n/client";
import { localizedServiceLabel } from "@/lib/i18n/content/checklists";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { Stamp } from "@/components/Stamp";
import { TaglineStamp } from "@/components/TaglineStamp";
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
  const ui = useUi();
  const locale = useLocale();
  const [view, setView] = useState<CheckinStatusView | null>(initial);
  const [loaded, setLoaded] = useState(initial !== null);
  const [isPending, startTransition] = useTransition();
  const [arriving, startArrive] = useTransition();
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

  function onArrive() {
    startArrive(async () => {
      await markArrivedByToken(token);
      await refetch();
    });
  }

  // Unknown / expired token.
  if (loaded && !view) {
    return (
      <div className="rounded-2xl border-2 border-line bg-mist p-8 text-center">
        <h2 className="font-display text-xl font-extrabold text-ink">
          {ui.status.notFoundTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fog">
          {ui.status.notFoundBody}
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/check-in" className="btn btn--primary">
            {ui.status.notFoundCta}
          </Link>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="rounded-2xl border border-line bg-mist/60 p-8 text-center text-fog">
        {ui.status.loading}
      </div>
    );
  }

  const serviceLabel = localizedServiceLabel(
    view.service_type,
    locale,
    ui.queue.visitFallback,
  );

  // ---- You're up -----------------------------------------------------------
  if (view.status === "in_progress") {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border-2 border-plate bg-plate/5 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-plate">
            {ui.status.upEyebrow}
          </p>
          <p className="mt-3 font-display text-6xl font-extrabold tracking-wide text-ink tabular-nums">
            {view.ticket_code}
          </p>
          <p className="mt-3 text-lg font-semibold text-ink">
            {ui.status.upHeadToCounter}
          </p>
          <p className="mt-1 text-fog">
            {ui.status.upShowTicket(view.ticket_code)}
          </p>
        </div>
      </div>
    );
  }

  // ---- Complete ------------------------------------------------------------
  if (view.status === "complete") {
    return (
      <div className="rounded-3xl border-2 border-ink bg-ink p-8 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
          {ui.status.completeEyebrow}
        </p>
        <p className="mt-3 font-display text-3xl font-extrabold">
          {ui.status.completeTitle}
        </p>
        <p className="mt-2 text-white/70">
          {ui.status.completeBody(view.ticket_code)}
        </p>
      </div>
    );
  }

  // ---- Cancelled -----------------------------------------------------------
  if (view.status === "cancelled") {
    return (
      <div className="rounded-2xl border border-line bg-mist p-8 text-center">
        <h2 className="font-display text-xl font-extrabold text-ink">
          {ui.status.cancelledTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fog">
          {ui.status.cancelledBody}
        </p>
        <div className="mt-5 flex justify-center">
          <Link href="/check-in" className="btn btn--primary">
            {ui.status.cancelledCta}
          </Link>
        </div>
      </div>
    );
  }

  // ---- No-show (recoverable, not terminal) ---------------------------------
  // Staff called this ticket and marked it a no-show. It is NOT cleared from
  // this device's resume memory (see the effect above), because staff can call
  // them again and flip this straight back to "you're up".
  if (view.status === "no_show") {
    return (
      <div className="rounded-2xl border border-line bg-mist p-8 text-center">
        <h2 className="font-display text-xl font-extrabold text-ink">
          {ui.status.noShowTitle(view.ticket_code)}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fog">
          {ui.status.noShowBody}
        </p>
      </div>
    );
  }

  // ---- Waiting (the live, ticking state) -----------------------------------
  const ahead = view.ahead;
  const youAreNext = view.queue_position <= 1;

  return (
    <div className="flex flex-col gap-6">
      <OfflineBanner />

      <div className="relative rounded-3xl border-2 border-ink bg-paper p-6 text-center sm:p-8">
        {/* Check-in success: the ticket confirmation is stamped as it appears.
            One-shot on mount (static under reduced motion); the only stamp in
            this flow. */}
        <Stamp
          label={ui.status.stampCheckedIn}
          ariaLabel={ui.status.stampCheckedInAria}
          animate
          className="pointer-events-none absolute -right-2 -top-5 h-16 w-16 sm:-right-4 sm:h-[4.75rem] sm:w-[4.75rem]"
        />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fog">
          {ui.status.ticketFor(serviceLabel)}
        </p>
        <p className="mt-2 font-display text-5xl font-extrabold tracking-wide text-ink tabular-nums">
          {view.ticket_code}
        </p>

        <div className="mt-6" aria-live="polite">
          {youAreNext ? (
            <p className="font-display text-2xl font-extrabold text-plate">
              {ui.status.youreNext}
            </p>
          ) : (
            <>
              <p className="font-display text-4xl font-extrabold text-ink tabular-nums">
                {ui.status.inLine(view.queue_position)}
              </p>
              <p className="mt-1 text-fog">{ui.status.peopleAhead(ahead)}</p>
            </>
          )}
        </div>

        <p className="mt-4 text-sm text-fog">
          {ui.checkinStatus[view.status].description}
        </p>

        {/* The celebratory beat: the brand tagline stamps in once as the
            check-in lands. Its only home on the site. */}
        <TaglineStamp
          tagline={ui.status.tagline}
          support={ui.status.taglineSupport || undefined}
          className="mt-6"
        />

        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="mt-5 text-sm font-semibold text-fog underline-offset-4 transition-colors hover:text-plate hover:underline disabled:opacity-60"
        >
          {isPending ? ui.status.cancelling : ui.status.cancel}
        </button>
      </div>

      {/* Self-service lobby arrival: a customer who held their spot from home taps
          this once they walk in, so staff can see they are actually here. Backed
          by the token-scoped set_arrived helper (the token is the authorization). */}
      {view.arrived_at ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-ink/15 bg-mist/60 px-4 py-3 text-center text-sm font-semibold text-ink">
          <span aria-hidden="true">✓</span>
          {ui.status.arrivedNote}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5 text-center">
          <p className="text-sm text-fog">{ui.status.imHereHint}</p>
          <button
            type="button"
            onClick={onArrive}
            disabled={arriving}
            className="btn btn--primary mt-3"
          >
            {arriving ? ui.status.imHereBusy : ui.status.imHere}
          </button>
        </div>
      )}

      <PushPrompt token={token} />

      <InstallPrompt placement="status" />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-fog">
          {ui.status.lineRightNow}
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
