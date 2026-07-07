"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CheckinQueueRow } from "@/lib/checkin/types";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { useLocale, useUi } from "@/lib/i18n/client";
import { localizedServiceLabel } from "@/lib/i18n/content/checklists";
import { useLiveQueue } from "./LiveQueueProvider";
import { StatusPill } from "./StatusPill";

/**
 * The anonymized public live queue — the ABC-beating differentiator. Shows
 * ticket codes + status only, updating in realtime. NEVER any PII: it reads the
 * PII-free public.checkin_queue view, and the realtime subscription is only a
 * "something changed, refetch" trigger (the event payload is ignored, and anon
 * is column-restricted regardless).
 */
type Variant = "board" | "compact" | "lobby";

const QUEUE_COLUMNS =
  "ticket_code, service_type, status, created_at, queue_position";

export function LiveQueue({
  initialRows = [],
  variant = "board",
  highlightTicket,
  suppressOfflineBanner = false,
}: {
  initialRows?: CheckinQueueRow[];
  variant?: Variant;
  highlightTicket?: string;
  /** When the host already shows one offline notice (e.g. the status page). */
  suppressOfflineBanner?: boolean;
}) {
  const ui = useUi();
  const locale = useLocale();
  // When wrapped in a LiveQueueProvider (the homepage), read the shared rows so
  // we don't open a second identical subscription. Otherwise self-subscribe.
  const shared = useLiveQueue();
  const usingShared = shared !== null;
  const [selfRows, setSelfRows] = useState<CheckinQueueRow[]>(initialRows);
  const rows = shared ? shared.rows : selfRows;

  const serviceLabel = (slug: string) =>
    localizedServiceLabel(slug, locale, ui.queue.visitFallback);

  useEffect(() => {
    if (usingShared) return;
    const supabase = createClient();
    let active = true;

    async function refetch() {
      const { data } = await supabase
        .from("checkin_queue")
        .select(QUEUE_COLUMNS)
        .order("queue_position", { ascending: true })
        .order("created_at", { ascending: true });
      if (active && data) setSelfRows(data);
    }

    refetch();

    const channel = supabase
      .channel("public-live-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins" },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [usingShared]);

  const serving = rows.filter((r) => r.status === "in_progress");
  const waiting = rows.filter((r) => r.status === "waiting");
  const isLobby = variant === "lobby";
  const isCompact = variant === "compact";

  const offlineBanner = suppressOfflineBanner ? null : <OfflineBanner />;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {offlineBanner}
        <div
          className={`rounded-2xl border border-line bg-mist/60 text-center text-fog ${
            isLobby ? "px-8 py-16 text-xl" : "px-6 py-10"
          }`}
        >
          <p className="font-display font-extrabold text-ink">
            {ui.queue.emptyTitle}
          </p>
          <p className="mt-1 text-sm">{ui.queue.emptyBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {offlineBanner}
      {/* Now serving */}
      {serving.length > 0 ? (
        <div
          className={`rounded-2xl border-2 border-plate bg-plate/5 ${
            isLobby ? "p-8" : "p-5"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plate">
            {ui.queue.nowServing}
          </p>
          <ul
            className={`mt-3 flex flex-wrap gap-3 ${isLobby ? "gap-5" : ""}`}
          >
            {serving.map((r) => (
              <li
                key={r.ticket_code}
                className={`font-display font-extrabold tracking-wide tabular-nums text-ink ${
                  isLobby ? "text-6xl" : "text-3xl"
                } ${highlightTicket === r.ticket_code ? "underline decoration-plate decoration-4 underline-offset-4" : ""}`}
              >
                {r.ticket_code}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Waiting list */}
      <div
        className={`rounded-2xl border border-line bg-paper ${isLobby ? "p-8" : "p-5"}`}
      >
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fog">
            {ui.queue.inLine}
          </p>
          <p className="text-xs font-medium text-fog">
            {ui.queue.waitingCount(waiting.length)}
          </p>
        </div>

        {waiting.length === 0 ? (
          <p className="mt-3 text-sm text-fog">{ui.queue.noneWaiting}</p>
        ) : (
          <ul
            className={`mt-3 ${
              isLobby
                ? "grid grid-cols-2 gap-4 sm:grid-cols-3"
                : isCompact
                  ? "flex flex-wrap gap-2"
                  : "flex flex-col gap-2"
            }`}
          >
            {waiting.map((r) => {
              const mine = highlightTicket === r.ticket_code;
              if (isCompact) {
                return (
                  <li
                    key={r.ticket_code}
                    className={`rounded-lg px-3 py-1.5 font-display text-sm font-extrabold tabular-nums ${
                      mine
                        ? "bg-ink text-white"
                        : "bg-mist text-ink ring-1 ring-line"
                    }`}
                  >
                    {r.ticket_code}
                  </li>
                );
              }
              return (
                <li
                  key={r.ticket_code}
                  className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
                    mine ? "bg-ink text-white" : "bg-mist"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`font-display font-extrabold tracking-wide tabular-nums ${
                        isLobby ? "text-3xl" : "text-xl"
                      } ${mine ? "text-white" : "text-ink"}`}
                    >
                      {r.ticket_code}
                    </span>
                    <span
                      className={`text-sm ${mine ? "text-white/70" : "text-fog"}`}
                    >
                      {serviceLabel(r.service_type)}
                    </span>
                  </span>
                  {mine ? (
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                      {ui.queue.you}
                    </span>
                  ) : (
                    <StatusPill status={r.status} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
