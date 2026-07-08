"use client";

import { useMemo, useState, useTransition } from "react";
import {
  undoTransactionStatus,
  updateTransactionAttention,
  updateTransactionStatus,
} from "@/lib/dealers/actions";
import {
  describeVehicle,
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_META,
  type DealerTransaction,
  type TransactionStatus,
} from "@/lib/dealers/types";
import type { StaffDealerTransaction } from "@/lib/dealers/dal";
import { StatusStepper } from "@/components/dealers/StatusStepper";
import { CopyButton } from "@/components/console/CopyButton";
import { UndoToast, useUndoToast } from "@/components/console/UndoToast";

/**
 * Staff-only console for dealer transactions.
 *
 * Staff see every dealer's work (RLS returns all rows to a staff caller), tagged
 * with the dealership. Per row they can advance the status step by step or jump
 * to any stage, and raise or clear the "needs attention" flag with a note. Each
 * write goes through the staff-gated server actions (RLS enforces staff-only
 * UPDATE); the returned row is merged back into local state so the console
 * reflects the change immediately, and moving a deal to "ready for pickup" fires
 * the dealer notification (email; dormant until Resend is configured).
 */

type Filter = "active" | "attention" | "ready" | "all";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function filedOn(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function ageLabel(iso: string): string {
  const d = daysSince(iso);
  if (d === 0) return "today";
  if (d === 1) return "1 day";
  return `${d} days`;
}

/** Sort key: attention first, then ready, then working, picked up last. */
function groupRank(tx: DealerTransaction): number {
  if (tx.status === "picked_up") return 3;
  if (tx.needs_attention) return 0;
  if (tx.status === "ready_for_pickup") return 1;
  return 2;
}

export function DealerTransactionsConsole({
  initial,
}: {
  initial: StaffDealerTransaction[];
}) {
  const [rows, setRows] = useState<StaffDealerTransaction[]>(initial);
  const [filter, setFilter] = useState<Filter>("active");
  const undo = useUndoToast();

  function applyUpdate(updated: DealerTransaction) {
    setRows((cur) =>
      cur.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
    );
  }

  // A status change is frequent and reversible, so it offers Undo (never a
  // confirm). Undo steps the transaction back to exactly its prior status via a
  // real inverse action, and merges the reverted row back into the console.
  function offerUndoAdvance(
    message: string,
    transactionId: string,
    previousStatus: TransactionStatus,
  ) {
    undo.show(message, async () => {
      const res = await undoTransactionStatus({ transactionId, previousStatus });
      if (res.ok && res.transaction) applyUpdate(res.transaction);
    });
  }

  const counts = useMemo(
    () => ({
      active: rows.filter((r) => r.status !== "picked_up").length,
      attention: rows.filter(
        (r) => r.needs_attention && r.status !== "picked_up",
      ).length,
      ready: rows.filter((r) => r.status === "ready_for_pickup").length,
      all: rows.length,
    }),
    [rows],
  );

  const shown = useMemo(() => {
    const filtered = rows.filter((r) => {
      switch (filter) {
        case "attention":
          return r.needs_attention && r.status !== "picked_up";
        case "ready":
          return r.status === "ready_for_pickup";
        case "all":
          return true;
        default:
          return r.status !== "picked_up";
      }
    });
    return [...filtered].sort((a, b) => {
      const g = groupRank(a) - groupRank(b);
      if (g !== 0) return g;
      // Oldest first within a group, so the stalest work surfaces.
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, [rows, filter]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "active", label: "Active", count: counts.active },
    { key: "attention", label: "Needs attention", count: counts.attention },
    { key: "ready", label: "Ready for pickup", count: counts.ready },
    { key: "all", label: "All", count: counts.all },
  ];

  if (rows.length === 0) {
    return (
      <p className="console-list px-4 py-12 text-center text-sm text-fog">
        No dealer transactions yet. They appear here the moment a dealer files
        one.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
        {chips.map((chip) => {
          const on = filter === chip.key;
          const attention = chip.key === "attention" && chip.count > 0;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                on
                  ? "border-ink bg-ink text-white"
                  : attention
                    ? "border-plate/30 bg-plate/5 text-plate hover:border-plate/50"
                    : "border-line bg-white text-fog hover:border-ink/40 hover:text-ink"
              }`}
            >
              {chip.label}
              <span
                className={`tabular-nums ${on ? "text-white/70" : "text-fog/70"}`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {shown.length === 0 ? (
          <p className="console-list px-4 py-10 text-center text-sm text-fog">
            Nothing in this view.
          </p>
        ) : (
          <ul className="console-list">
            {shown.map((tx) => (
              <StaffRow
                key={tx.id}
                tx={tx}
                onUpdate={applyUpdate}
                onUndoAdvance={offerUndoAdvance}
              />
            ))}
          </ul>
        )}
      </div>

      <UndoToast controller={undo} />
    </div>
  );
}

function StaffRow({
  tx,
  onUpdate,
  onUndoAdvance,
}: {
  tx: StaffDealerTransaction;
  onUpdate: (updated: DealerTransaction) => void;
  onUndoAdvance: (
    message: string,
    transactionId: string,
    previousStatus: TransactionStatus,
  ) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(tx.attention_note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const stock = tx.stock_number?.trim();
  const vehicle = describeVehicle(tx);
  const type = tx.transaction_type?.trim();
  const attention = tx.needs_attention;
  const ready = tx.status === "ready_for_pickup";

  const accent = attention
    ? "border-l-plate bg-plate/[0.03]"
    : ready
      ? "border-l-emerald-400 bg-emerald-50/40"
      : "border-l-transparent";

  function run(
    fn: () => Promise<{
      ok: boolean;
      error?: string;
      emailed?: boolean;
      transaction?: DealerTransaction;
    }>,
    onOk: (emailed: boolean) => string,
  ) {
    setError(null);
    setFlash(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok || !res.transaction) {
        setError(res.error ?? "Something went wrong. Try again.");
        return;
      }
      onUpdate(res.transaction);
      setFlash(onOk(Boolean(res.emailed)));
    });
  }

  function setStatus(status: TransactionStatus) {
    // Capture the status we are leaving so Undo can step back to exactly it.
    const previousStatus = tx.status;
    setError(null);
    setFlash(null);
    startTransition(async () => {
      const res = await updateTransactionStatus({
        transactionId: tx.id,
        status,
      });
      if (!res.ok || !res.transaction) {
        setError(res.error ?? "Something went wrong. Try again.");
        return;
      }
      onUpdate(res.transaction);
      const message =
        status === "ready_for_pickup"
          ? res.emailed
            ? "Marked ready. Dealer emailed."
            : "Marked ready. Email dormant (Resend not configured)."
          : `Moved to ${TRANSACTION_STATUS_META[status].label}.`;
      onUndoAdvance(message, tx.id, previousStatus);
    });
  }

  function flag(needsAttention: boolean) {
    run(
      () =>
        updateTransactionAttention({
          transactionId: tx.id,
          needsAttention,
          attentionNote: needsAttention ? note : null,
        }),
      (emailed) =>
        needsAttention
          ? emailed
            ? "Flagged. Dealer emailed."
            : "Flagged. Email dormant (Resend not configured)."
          : "Attention flag cleared.",
    );
  }

  return (
    <li
      className={`console-row group flex flex-col gap-3 border-l-4 px-4 py-4 ${accent}`}
    >
      {/* Identity line */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="console-caption uppercase tracking-wide">
            {tx.dealershipName}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {stock ? (
              <span className="inline-flex items-center gap-1">
                <span className="font-mono text-sm font-bold tabular-nums text-ink">
                  #{stock}
                </span>
                <CopyButton value={stock} label="stock number" />
              </span>
            ) : (
              <span className="text-sm font-semibold text-fog">No stock #</span>
            )}
            <span className="font-display text-base font-extrabold text-ink">
              {vehicle}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-fog">
            {type || "Type to be confirmed"}
            <span className="px-1.5 text-line">·</span>
            Filed {filedOn(tx.created_at)}
            <span className="px-1.5 text-line">·</span>
            {ageLabel(tx.created_at)} old
            {tx.vin?.trim() ? (
              <>
                <span className="px-1.5 text-line">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-mono text-xs tracking-tight">
                    {tx.vin.trim()}
                  </span>
                  <CopyButton value={tx.vin.trim()} label="VIN" />
                </span>
              </>
            ) : null}
          </p>
        </div>
        <StatusStepper status={tx.status} className="shrink-0" />
      </div>

      {/* Status control: click any stage to jump; click the next to advance. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TRANSACTION_STATUSES.map((status) => {
          const isCurrent = status === tx.status;
          return (
            <button
              key={status}
              type="button"
              disabled={pending || isCurrent}
              onClick={() => setStatus(status)}
              aria-current={isCurrent ? "true" : undefined}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-default ${
                isCurrent
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-fog hover:border-ink hover:text-ink disabled:opacity-50"
              }`}
            >
              {TRANSACTION_STATUS_META[status].label}
            </button>
          );
        })}
      </div>

      {/* Attention control */}
      <div className="rounded-lg border border-line bg-white/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-fog">
            {attention ? "Flagged for attention" : "Attention flag"}
          </span>
          {attention ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => flag(false)}
              className="text-xs font-semibold text-fog underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
            >
              Clear flag
            </button>
          ) : null}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="What does the dealer need to resolve? (shown to them)"
          className="mt-2 w-full resize-y rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition placeholder:text-fog/60 focus:border-ink"
        />
        <div className="mt-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => flag(true)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              attention
                ? "border border-line bg-white text-ink hover:border-ink"
                : "bg-plate text-white hover:bg-plate/90"
            }`}
          >
            {attention ? "Update note" : "Flag for attention"}
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {flash}
        </p>
      ) : null}
    </li>
  );
}
