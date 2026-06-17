"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTransactionPath } from "@/lib/checklists";
import type { CheckinQueueRow } from "@/lib/checkin/types";
import { StatusPill } from "./StatusPill";

/**
 * The anonymized public live queue — the ABC-beating differentiator. Shows
 * ticket codes + status only, updating in realtime. NEVER any PII: it reads the
 * PII-free public.checkin_queue view, and the realtime subscription is only a
 * "something changed, refetch" trigger (the event payload is ignored, and anon
 * is column-restricted regardless).
 */
type Variant = "board" | "compact" | "lobby";

const QUEUE_COLUMNS = "ticket_code, service_type, status, created_at, position";

function serviceLabel(slug: string): string {
  return getTransactionPath(slug)?.label ?? "Visit";
}

export function LiveQueue({
  initialRows = [],
  variant = "board",
  highlightTicket,
}: {
  initialRows?: CheckinQueueRow[];
  variant?: Variant;
  highlightTicket?: string;
}) {
  const [rows, setRows] = useState<CheckinQueueRow[]>(initialRows);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function refetch() {
      const { data } = await supabase
        .from("checkin_queue")
        .select(QUEUE_COLUMNS)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (active && data) setRows(data);
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
  }, []);

  const serving = rows.filter((r) => r.status === "in_progress");
  const waiting = rows.filter((r) => r.status === "waiting");
  const isLobby = variant === "lobby";
  const isCompact = variant === "compact";

  if (rows.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-line bg-mist/60 text-center text-fog ${
          isLobby ? "px-8 py-16 text-xl" : "px-6 py-10"
        }`}
      >
        <p className="font-display font-extrabold text-ink">
          No one&rsquo;s in line right now
        </p>
        <p className="mt-1 text-sm">Walk right in. The counter&rsquo;s open.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {/* Now serving */}
      {serving.length > 0 ? (
        <div
          className={`rounded-2xl border-2 border-plate bg-plate/5 ${
            isLobby ? "p-8" : "p-5"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-plate">
            Now serving
          </p>
          <ul
            className={`mt-3 flex flex-wrap gap-3 ${isLobby ? "gap-5" : ""}`}
          >
            {serving.map((r) => (
              <li
                key={r.ticket_code}
                className={`font-display font-extrabold tracking-wide text-ink ${
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
            In line
          </p>
          <p className="text-xs font-medium text-fog">
            {waiting.length} waiting
          </p>
        </div>

        {waiting.length === 0 ? (
          <p className="mt-3 text-sm text-fog">No one waiting.</p>
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
                    className={`rounded-lg px-3 py-1.5 font-display text-sm font-extrabold ${
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
                      className={`font-display font-extrabold tracking-wide ${
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
                      You
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
