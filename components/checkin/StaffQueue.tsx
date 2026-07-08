"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  advanceCheckinStatus,
  markCheckinArrived,
  saveCheckinChecklist,
  undoCompleteCheckin,
  undoMarkArrived,
  undoNoShowCheckin,
} from "@/lib/checkin/actions";
import { getTransactionPath } from "@/lib/checklists";
import { summarizeReadiness } from "@/lib/checkin/readiness";
import { blankFormFor } from "@/lib/checkin/checklist";
import { useHydrated } from "@/lib/hooks/use-client";
import { StatTile } from "@/components/console/ConsoleUI";
import { CopyButton } from "@/components/console/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { HelpLink } from "@/components/staff/HelpLink";
import { UndoToast, useUndoToast } from "@/components/console/UndoToast";
import {
  sortStaffQueue,
  type AdvanceStatusInput,
  type Checkin,
} from "@/lib/checkin/types";

/**
 * Staff queue console (client). Realtime full-detail view of the active line,
 * WITH customer names/contact — gated server-side by is_staff() + RLS. Controls
 * advance status; calling a customer up (and Recall / Call again, which set
 * in_progress) fires the customer's email + push via the shared action path.
 */
function serviceLabel(slug: string): string {
  return getTransactionPath(slug)?.label ?? slug;
}

/** A friendly name for a toast: the customer's name, or the ticket code. */
function displayName(row: Checkin): string {
  return row.name?.trim() || row.ticket_code;
}

// Shared secondary-button look (the quiet outline control), so every secondary
// action reads identically across the active and no-show rows.
const secondaryBtn = "btn btn--secondary btn--sm";

/**
 * The customer info block (ticket + place badge + name/contact + readiness),
 * shared by the active queue and the no-shows group so both read identically.
 */
function CustomerCell({
  row,
  place,
  waitedLabel,
}: {
  row: Checkin;
  place: number;
  waitedLabel: (createdAt: string) => string;
}) {
  // Self-reported, opt-in checklist readiness (only when shared). A prep
  // heads-up, never a guarantee: staff still verify documents at the counter.
  const readiness = summarizeReadiness(row.service_type, row.readiness);
  return (
    <div className="flex items-start gap-4">
      <div className="text-center">
        <p className="font-display text-2xl font-extrabold tracking-wide text-ink">
          {row.ticket_code}
        </p>
        {row.status === "in_progress" ? (
          <p className="mt-0.5 text-xs font-semibold uppercase text-plate">
            Now
          </p>
        ) : row.status === "no_show" ? (
          <p className="mt-0.5 text-xs font-semibold uppercase text-fog">
            Missed
          </p>
        ) : place > 0 ? (
          <p className="mt-0.5 text-xs font-medium text-fog">#{place}</p>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="font-display text-base font-extrabold text-ink">
          {row.name?.trim() || "Guest"}
        </p>
        <p className="mt-0.5 text-sm text-fog">
          {serviceLabel(row.service_type)}
          <span className="px-1.5 text-line">·</span>
          {waitedLabel(row.created_at)}
        </p>
        {row.status === "waiting" || row.status === "in_progress" ? (
          <p className="mt-1">
            {row.arrived_at ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-ink/20 bg-mist px-2 py-0.5 text-xs font-semibold text-ink">
                <span aria-hidden="true">●</span> In lobby
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-fog">
                <span aria-hidden="true">○</span> On the way
              </span>
            )}
          </p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-fog">
          {row.email ? <span>{row.email}</span> : null}
          {row.email && row.phone ? (
            <span className="text-line">·</span>
          ) : null}
          {row.phone ? (
            <span className="inline-flex items-center gap-1.5">
              <a
                href={`tel:${row.phone}`}
                className="text-fog underline-offset-2 hover:text-plate hover:underline"
              >
                {row.phone}
              </a>
              <CopyButton value={row.phone} label="phone" />
            </span>
          ) : null}
        </p>
        {row.service_type === "registration-renewal" &&
        (row.renewal_date || row.marketing_consent) ? (
          <p className="mt-1 text-xs font-medium text-ink">
            {row.renewal_date ? <span>Renewal {row.renewal_date}</span> : null}
            {row.renewal_date && row.marketing_consent ? " · " : ""}
            {row.marketing_consent ? (
              <span className="text-plate">Opted in to reminders</span>
            ) : null}
          </p>
        ) : null}
        {row.push_subscription ? (
          <p className="mt-1 text-xs text-fog">🔔 Push enabled</p>
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
                Says still missing: {readiness.missingLabels.join(", ")}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-fog">
              Self-reported, not verified. Confirm documents at the counter.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The serving-card checklist: the transaction's "what to bring" items with a
 * checkbox each, so a clerk can tick documents off as they verify them. Reference
 * state, NOT enforcement (nothing is blocked by it). Checked state persists per
 * check-in (checked_items). Items that map 1:1 to a blank forms-library PDF link
 * it, so the clerk can pull up the form without leaving the queue.
 */
function ServingChecklist({
  row,
  onToggle,
}: {
  row: Checkin;
  onToggle: (itemId: string) => void;
}) {
  const path = getTransactionPath(row.service_type);
  if (!path) return null;
  const checked = new Set(row.checked_items ?? []);
  return (
    <div className="mt-4 border-t border-plate/20 pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fog">
          Counter checklist
          <HelpLink anchor="queue-checklist" label="the counter checklist" />
        </p>
        <p className="text-xs font-medium text-fog">
          {checked.size} of {path.items.length} confirmed
        </p>
      </div>
      <p className="mt-0.5 text-xs text-fog">
        Reference only. Confirm each document in person.
      </p>
      <ul className="mt-2 space-y-1.5">
        {path.items.map((item) => {
          const isChecked = checked.has(item.id);
          const blank = blankFormFor(item.formSlug);
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(item.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
                />
                <span className="min-w-0 flex-1 text-sm">
                  <span
                    className={
                      isChecked
                        ? "font-medium text-fog line-through"
                        : "font-medium text-ink"
                    }
                  >
                    {item.label}
                  </span>
                  {item.detail ? (
                    <span className="block text-xs text-fog">{item.detail}</span>
                  ) : null}
                  {blank ? (
                    <a
                      href={blank.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block text-xs font-semibold text-ink underline-offset-2 hover:text-plate hover:underline"
                    >
                      Blank {blank.label} (PDF)
                    </a>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Inline confirm for the one destructive, infrequent queue action: removing a
 * customer from the line (Cancel). A named prompt ("Remove [name] from the
 * line?") so a mistaken cancel in a busy lobby is caught. Focus lands on the
 * non-destructive "Keep in line" by default, so Enter never destroys; Escape
 * dismisses. (Frequent, reversible actions get Undo instead, never a confirm.)
 */
function CancelConfirmBar({
  name,
  busy,
  onKeep,
  onConfirm,
}: {
  name: string;
  busy: boolean;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
  }, []);
  return (
    <div
      role="group"
      aria-label={`Remove ${name} from the line`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onKeep();
      }}
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-plate/30 bg-plate/[0.04] px-3 py-2.5"
    >
      <span className="text-sm font-medium text-ink">
        Remove {name} from the line?
      </span>
      <button
        ref={keepRef}
        type="button"
        onClick={onKeep}
        className="btn btn--secondary btn--sm"
      >
        Keep in line
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="btn btn--danger btn--sm"
      >
        Remove
      </button>
    </div>
  );
}

export function StaffQueue({ initial }: { initial: Checkin[] }) {
  const hydrated = useHydrated();
  const [rows, setRows] = useState<Checkin[]>(initial);
  const [now, setNow] = useState<number>(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Checkin | null>(null);
  const [isPending, startTransition] = useTransition();
  const undo = useUndoToast();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const refetch = useCallback(async () => {
    const supabase = supabaseRef.current ?? createClient();
    supabaseRef.current = supabase;
    const { data } = await supabase
      .from("checkins")
      .select("*")
      .in("status", ["waiting", "in_progress", "no_show"])
      .order("created_at", { ascending: true });
    if (data) setRows(sortStaffQueue(data));
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

  // Run an undo action (a real server-side inverse), then refetch. Surfaces any
  // failure inline; the toast has already dismissed itself.
  function runUndo(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "Could not undo.");
      }
      await refetch();
    });
  }

  // Complete + No-show are frequent and reversible, so they fire immediately and
  // offer Undo (never a confirm). Undo is a real inverse action, logged in its
  // own right; the customer is never re-notified.
  function completeCheckin(row: Checkin) {
    setError(null);
    startTransition(async () => {
      const result = await advanceCheckinStatus({
        id: row.id,
        status: "complete",
      });
      if (!result.ok) {
        setError(result.error ?? "Could not update.");
        await refetch();
        return;
      }
      await refetch();
      undo.show(`Completed ${displayName(row)}.`, () =>
        runUndo(() => undoCompleteCheckin(row.id)),
      );
    });
  }

  function noShow(row: Checkin) {
    setError(null);
    startTransition(async () => {
      const result = await advanceCheckinStatus({
        id: row.id,
        status: "no_show",
      });
      if (!result.ok) {
        setError(result.error ?? "Could not update.");
        await refetch();
        return;
      }
      await refetch();
      undo.show(`Marked ${displayName(row)} a no-show.`, () =>
        runUndo(() => undoNoShowCheckin(row.id)),
      );
    });
  }

  // Removing someone from the line is destructive and infrequent: confirm it (see
  // CancelConfirmBar), no undo.
  function cancelConfirmed(row: Checkin) {
    setConfirmCancel(null);
    act({ id: row.id, status: "cancelled" });
  }

  // Staff backup for arrival (the customer's own "I'm here" is the primary path).
  // Reversible, so it offers Undo.
  function arrive(row: Checkin) {
    setError(null);
    startTransition(async () => {
      const result = await markCheckinArrived(row.id);
      if (!result.ok) {
        setError(result.error ?? "Could not mark arrived.");
        await refetch();
        return;
      }
      await refetch();
      undo.show(`Marked ${displayName(row)} arrived.`, () =>
        runUndo(() => undoMarkArrived(row.id)),
      );
    });
  }

  // Calling up is allowed even when a customer hasn't been marked arrived, but we
  // ask for a quick confirm so a not-yet-here customer isn't called by accident.
  function callUp(row: Checkin) {
    if (
      !row.arrived_at &&
      !window.confirm(
        "This customer hasn’t been marked as arrived. Call them up anyway?",
      )
    ) {
      return;
    }
    act({ id: row.id, status: "in_progress" });
  }

  // Tick a serving-card checklist item. Reference state, not enforcement: we
  // update the row optimistically for instant feedback, then persist the FULL
  // confirmed set (idempotent, race-free) and reconcile with the server's
  // sanitized, checklist-ordered result. Other counters see it via realtime.
  const toggleChecklistItem = useCallback(
    (row: Checkin, itemId: string) => {
      const current = new Set(row.checked_items ?? []);
      if (current.has(itemId)) current.delete(itemId);
      else current.add(itemId);
      const next = [...current];

      setRows((rs) =>
        rs.map((r) => (r.id === row.id ? { ...r, checked_items: next } : r)),
      );
      setError(null);
      startTransition(async () => {
        const res = await saveCheckinChecklist(row.id, next);
        const confirmed = res.checkedItems;
        if (!res.ok) {
          setError(res.error ?? "Could not save the checklist.");
          await refetch();
        } else if (confirmed) {
          setRows((rs) =>
            rs.map((r) =>
              r.id === row.id ? { ...r, checked_items: confirmed } : r,
            ),
          );
        }
      });
    },
    [refetch],
  );

  const waitedLabel = useCallback(
    (createdAt: string): string => {
      if (!hydrated) return "";
      const mins = Math.max(
        0,
        Math.round((now - new Date(createdAt).getTime()) / 60000),
      );
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m waiting`;
      const h = Math.floor(mins / 60);
      return `${h}h ${mins % 60}m waiting`;
    },
    [hydrated, now],
  );

  const serving = rows.filter((r) => r.status === "in_progress");
  const waiting = rows.filter((r) => r.status === "waiting");
  const inLobby = waiting.filter((r) => r.arrived_at).length;
  const noShows = rows.filter((r) => r.status === "no_show");
  const active = rows.filter(
    (r) => r.status === "in_progress" || r.status === "waiting",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm sm:grid-cols-3">
        <StatTile label="Serving" value={serving.length} />
        <StatTile
          label={
            <span className="inline-flex items-center gap-1.5">
              Waiting
              <HelpLink anchor="queue-arrivals" label="arrivals and the lobby" />
            </span>
          }
          value={
            <span className="flex items-baseline gap-1.5">
              {waiting.length}
              <span className="text-sm font-semibold text-fog">
                ({inLobby} in lobby)
              </span>
            </span>
          }
        />
        <StatTile label="No-shows" value={noShows.length} />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}

      {active.length === 0 ? (
        <EmptyState
          title="The line is empty"
          description="New check-ins appear here automatically."
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {active.map((r) => {
            const place =
              r.status === "waiting"
                ? waiting.findIndex((w) => w.id === r.id) + 1
                : 0;
            return (
              <li
                key={r.id}
                className={`group rounded-xl border p-4 ${
                  r.status === "in_progress"
                    ? "border-plate bg-plate/5"
                    : "border-line bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <CustomerCell
                    row={r}
                    place={place}
                    waitedLabel={waitedLabel}
                  />

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {r.status === "waiting" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => callUp(r)}
                          disabled={isPending}
                          className="btn btn--primary btn--sm"
                        >
                          Call up
                        </button>
                        {!r.arrived_at ? (
                          <button
                            type="button"
                            onClick={() => arrive(r)}
                            disabled={isPending}
                            className={secondaryBtn}
                            title="Mark this customer as in the lobby"
                          >
                            Mark arrived
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setConfirmCancel(r)}
                          disabled={isPending}
                          className={secondaryBtn}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/staff/fees?checkin=${r.id}`}
                          className="btn btn--secondary btn--sm"
                          title="Open the fee calculator linked to this check-in"
                        >
                          Start transaction
                        </Link>
                        <button
                          type="button"
                          onClick={() => completeCheckin(r)}
                          disabled={isPending}
                          className="btn btn--primary btn--sm"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            act({ id: r.id, status: "in_progress" })
                          }
                          disabled={isPending}
                          className={secondaryBtn}
                          title="Re-send the email and push notification"
                        >
                          Recall
                        </button>
                        <button
                          type="button"
                          onClick={() => act({ id: r.id, status: "waiting" })}
                          disabled={isPending}
                          className={secondaryBtn}
                          title="Put them back in line (no notification)"
                        >
                          Return to waiting
                        </button>
                        <button
                          type="button"
                          onClick={() => noShow(r)}
                          disabled={isPending}
                          className={secondaryBtn}
                        >
                          No-show
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {confirmCancel?.id === r.id ? (
                  <CancelConfirmBar
                    name={displayName(r)}
                    busy={isPending}
                    onKeep={() => setConfirmCancel(null)}
                    onConfirm={() => cancelConfirmed(r)}
                  />
                ) : null}

                {r.status === "in_progress" ? (
                  <ServingChecklist
                    row={r}
                    onToggle={(itemId) => toggleChecklistItem(r, itemId)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {noShows.length > 0 ? (
        <section className="border-t border-line pt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-fog">
              No-shows
              <HelpLink anchor="queue-no-show" label="no-shows" />
            </h2>
            <p className="text-xs font-medium text-fog">
              {noShows.length} waiting to be recovered
            </p>
          </div>
          <p className="mt-1 text-xs text-fog">
            Called up but did not appear. Call again when they turn up; it
            re-sends the same notification and returns them to serving.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {noShows.map((r) => (
              <li
                key={r.id}
                className="group rounded-xl border border-line bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <CustomerCell row={r} place={0} waitedLabel={waitedLabel} />

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => act({ id: r.id, status: "in_progress" })}
                      disabled={isPending}
                      className="btn btn--primary btn--sm"
                      title="Re-send the email and push notification"
                    >
                      Call again
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(r)}
                      disabled={isPending}
                      className={secondaryBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {confirmCancel?.id === r.id ? (
                  <CancelConfirmBar
                    name={displayName(r)}
                    busy={isPending}
                    onKeep={() => setConfirmCancel(null)}
                    onConfirm={() => cancelConfirmed(r)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <UndoToast controller={undo} />
    </div>
  );
}
