"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { advanceCheckinStatus } from "@/lib/checkin/actions";
import { getTransactionPath } from "@/lib/checklists";
import { summarizeReadiness } from "@/lib/checkin/readiness";
import { useHydrated } from "@/lib/hooks/use-client";
import type { AdvanceStatusInput, Checkin } from "@/lib/checkin/types";

/**
 * Staff queue console (client). Realtime full-detail view of the active line,
 * WITH customer names/contact — gated server-side by is_staff() + RLS. Controls
 * advance status, which fires the customer's email + push notifications.
 */
function serviceLabel(slug: string): string {
  return getTransactionPath(slug)?.label ?? slug;
}

function sortQueue(rows: Checkin[]): Checkin[] {
  return [...rows].sort((a, b) => {
    if (a.status !== b.status) return a.status === "in_progress" ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function StaffQueue({ initial }: { initial: Checkin[] }) {
  const hydrated = useHydrated();
  const [rows, setRows] = useState<Checkin[]>(initial);
  const [now, setNow] = useState<number>(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const refetch = useCallback(async () => {
    const supabase = supabaseRef.current ?? createClient();
    supabaseRef.current = supabase;
    const { data } = await supabase
      .from("checkins")
      .select("*")
      .in("status", ["waiting", "in_progress"])
      .order("created_at", { ascending: true });
    if (data) setRows(sortQueue(data));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;

    const channel = supabase
      .channel("staff-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins" },
        () => {
          refetch();
        },
      )
      .subscribe();

    const interval = window.setInterval(() => setNow(Date.now()), 30000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [refetch]);

  function act(input: AdvanceStatusInput) {
    setError(null);
    startTransition(async () => {
      const result = await advanceCheckinStatus(input);
      if (!result.ok) {
        setError(result.error ?? "Could not update.");
      }
      await refetch();
    });
  }

  function waitedLabel(createdAt: string): string {
    if (!hydrated) return "";
    const mins = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m waiting`;
    const h = Math.floor(mins / 60);
    return `${h}h ${mins % 60}m waiting`;
  }

  const serving = rows.filter((r) => r.status === "in_progress");
  const waiting = rows.filter((r) => r.status === "waiting");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
        <div className="rounded-xl border border-line bg-mist p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fog">
            Serving
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold text-ink">
            {serving.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-mist p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fog">
            Waiting
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold text-ink">
            {waiting.length}
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-mist/60 px-6 py-14 text-center">
          <h3 className="text-lg font-extrabold text-ink">The line is empty</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-fog">
            New check-ins appear here automatically.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const place =
              r.status === "waiting"
                ? waiting.findIndex((w) => w.id === r.id) + 1
                : 0;
            // Self-reported, opt-in checklist readiness (only when shared). A
            // prep heads-up, never a guarantee: staff still verify at the counter.
            const readiness = summarizeReadiness(r.service_type, r.readiness);
            return (
              <li
                key={r.id}
                className={`rounded-xl border p-4 sm:p-5 ${
                  r.status === "in_progress"
                    ? "border-plate bg-plate/5"
                    : "border-line bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="text-center">
                      <p className="font-display text-2xl font-extrabold tracking-wide text-ink">
                        {r.ticket_code}
                      </p>
                      {place > 0 ? (
                        <p className="mt-0.5 text-xs font-medium text-fog">
                          #{place}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs font-semibold uppercase text-plate">
                          Now
                        </p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-base font-extrabold text-ink">
                        {r.name?.trim() || "Guest"}
                      </p>
                      <p className="mt-0.5 text-sm text-fog">
                        {serviceLabel(r.service_type)}
                        <span className="px-1.5 text-line">·</span>
                        {waitedLabel(r.created_at)}
                      </p>
                      <p className="mt-1 text-sm text-fog">
                        {r.email ? <span>{r.email}</span> : null}
                        {r.email && r.phone ? (
                          <span className="px-1.5 text-line">·</span>
                        ) : null}
                        {r.phone ? <span>{r.phone}</span> : null}
                      </p>
                      {r.service_type === "registration-renewal" &&
                      (r.renewal_date || r.marketing_consent) ? (
                        <p className="mt-1 text-xs font-medium text-ink">
                          {r.renewal_date ? (
                            <span>Renewal {r.renewal_date}</span>
                          ) : null}
                          {r.renewal_date && r.marketing_consent ? " · " : ""}
                          {r.marketing_consent ? (
                            <span className="text-plate">
                              Opted in to reminders
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      {r.push_subscription ? (
                        <p className="mt-1 text-xs text-fog">
                          🔔 Push enabled
                        </p>
                      ) : null}
                      {readiness ? (
                        <div className="mt-2 rounded-lg border border-line bg-mist/70 p-2.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-fog">
                            Self-reported checklist
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-ink">
                            {readiness.allReady
                              ? `Customer says they have all ${readiness.total} items ready`
                              : `Customer says they have ${readiness.readyCount} of ${readiness.total} ready`}
                          </p>
                          {readiness.missingLabels.length > 0 ? (
                            <p className="mt-0.5 text-sm font-medium text-plate">
                              Says still missing:{" "}
                              {readiness.missingLabels.join(", ")}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-fog">
                            Self-reported, not verified. Confirm documents at the
                            counter.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {r.status === "waiting" ? (
                      <button
                        type="button"
                        onClick={() => act({ id: r.id, status: "in_progress" })}
                        disabled={isPending}
                        className="plate-btn plate-btn--red text-sm disabled:opacity-60"
                      >
                        Call up
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => act({ id: r.id, status: "complete" })}
                        disabled={isPending}
                        className="plate-btn text-sm disabled:opacity-60"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => act({ id: r.id, status: "cancelled" })}
                      disabled={isPending}
                      className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-fog transition-colors hover:border-plate hover:text-plate disabled:opacity-60"
                    >
                      {r.status === "waiting" ? "No-show" : "Cancel"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
