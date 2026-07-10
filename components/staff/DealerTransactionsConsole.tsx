"use client";

import { useMemo, useRef, useState } from "react";
import {
  undoTransactionStatus,
  updateTransactionAttention,
  updateTransactionStatus,
} from "@/lib/dealers/actions";
import {
  describeVehicle,
  statusStepIndex,
  TRANSACTION_STATUSES,
  TRANSACTION_STATUS_META,
  type DealerTransaction,
  type TransactionStatus,
} from "@/lib/dealers/types";
import type { StaffDealerTransaction } from "@/lib/dealers/dal";
import { businessToday, formatBusinessDate } from "@/lib/transactions/day";
import { shortId } from "@/lib/transactions/format";
import { DealerDealPanel } from "@/components/staff/DealerDealPanel";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { EmptyState as BrandedEmptyState } from "@/components/EmptyState";

/**
 * Staff-only console for dealer transactions — a flat table (one row per deal)
 * that opens a right-hand detail panel where every action lives. Reversible,
 * internal moves are instant; the moves that email a dealer (advance to "ready
 * for pickup", raise/update a flag) are gated behind a confirm dialog. Every
 * write goes through the staff-gated server actions (RLS enforces staff-only
 * UPDATE) and the returned row is merged back into local state, so the console
 * reflects the change immediately without a refetch.
 */

type Filter = "active" | "attention" | "ready" | "all";

// Column budget for the ~962px console container (max-w-5xl page, px-6). Text
// columns are minmax(0,…fr) so they flex-and-ellipsize to fit rather than
// forcing a scroll; the rest are tight fixed widths. minWidth is the fallback:
// below ~950px the container drops under it and the table scrolls instead.
// rail · Dealer · Deal · Service · Filed · Age · Status · Flag · chevron
const GRID_COLS =
  "3px minmax(0,1fr) minmax(0,1.4fr) minmax(0,0.8fr) 88px 38px 128px 44px 20px";
const gridStyle = { gridTemplateColumns: GRID_COLS, minWidth: "900px" };

const STATUS_BADGE: Record<TransactionStatus, string> = {
  submitted: "border border-transparent bg-ink/[0.05] text-fog",
  received: "border border-transparent bg-ink/[0.09] text-ink/80",
  in_progress: "border border-transparent bg-ink/[0.13] text-ink",
  ready_for_pickup: "border border-ink bg-ink text-white",
  picked_up: "border border-line bg-transparent text-fog",
};

/** The deal's human reference: its stock number, else a short id off the uuid. */
function dealRef(tx: DealerTransaction): string {
  const stock = tx.stock_number?.trim();
  return stock ? `#${stock}` : `#${shortId(tx.id)}`;
}

/** Whole days between a filed instant and today, both in the office's zone. */
function ageDays(iso: string, today: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const filed = businessToday(d);
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${filed}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

interface ConfirmRequest {
  heading: string;
  body: string;
  confirmLabel: string;
  run: () => void;
}

export function DealerTransactionsConsole({
  initial,
  currentStaffName,
}: {
  initial: StaffDealerTransaction[];
  /** Signed-in staff name, used to attribute a flag raised in this session. */
  currentStaffName: string;
}) {
  const [rows, setRows] = useState<StaffDealerTransaction[]>(initial);
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingRef = useRef(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const today = businessToday();

  // Keep the panel's content mounted through the slide-out: while closing,
  // selectedTx is null but lastTx still holds the deal being dismissed. Adjusting
  // state during render (not in an effect) is React's supported pattern.
  const selectedTx = rows.find((r) => r.id === selectedId) ?? null;
  const [lastTx, setLastTx] = useState<StaffDealerTransaction | null>(null);
  if (selectedTx && selectedTx !== lastTx) {
    setLastTx(selectedTx);
  }
  const panelTx = selectedTx ?? lastTx;
  const panelOpen = selectedId !== null;

  function applyUpdate(
    updated: DealerTransaction,
    attribution?: { flaggedAt: string | null; flaggedByName: string | null },
  ) {
    setRows((cur) =>
      cur.map((r) =>
        r.id === updated.id ? { ...r, ...updated, ...(attribution ?? {}) } : r,
      ),
    );
  }

  // One mutation at a time. The ref guards a synchronous double-fire; `pending`
  // disables the panel's action buttons so exactly one request (and at most one
  // email) leaves per user intent.
  async function runMutation(
    fn: () => Promise<{
      ok: boolean;
      error?: string;
      emailed?: boolean;
      transaction?: DealerTransaction;
    }>,
    onOk: (updated: DealerTransaction, emailed: boolean) => void,
  ) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const res = await fn();
      if (res.ok && res.transaction) {
        onOk(res.transaction, Boolean(res.emailed));
      } else {
        setError(res.error ?? "Something went wrong. Try again.");
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function onConfirmYes() {
    const req = confirm;
    setConfirm(null);
    req?.run();
  }

  // --- Actions (gating derived from the email audit) -----------------------

  function advance(tx: StaffDealerTransaction) {
    const next = TRANSACTION_STATUSES[statusStepIndex(tx.status) + 1] ?? null;
    if (!next) return;
    const go = () =>
      runMutation(
        () => updateTransactionStatus({ transactionId: tx.id, status: next }),
        (updated) => applyUpdate(updated),
      );
    // Only "ready for pickup" emails the dealer — gate that one.
    if (next === "ready_for_pickup") {
      setConfirm({
        heading: "Mark ready for pickup?",
        body: `Mark ${dealRef(tx)}, ${describeVehicle(tx)}, ready for pickup? This emails ${tx.dealershipName}.`,
        confirmLabel: "Mark ready for pickup",
        run: go,
      });
    } else {
      go();
    }
  }

  function returnPrev(tx: StaffDealerTransaction) {
    const prev = TRANSACTION_STATUSES[statusStepIndex(tx.status) - 1] ?? null;
    if (!prev) return;
    // The inverse action never emails, so a backward correction is instant.
    runMutation(
      () =>
        undoTransactionStatus({ transactionId: tx.id, previousStatus: prev }),
      (updated) => applyUpdate(updated),
    );
  }

  function flagSubmit(tx: StaffDealerTransaction, note: string) {
    const already = tx.needs_attention;
    const go = () =>
      runMutation(
        () =>
          updateTransactionAttention({
            transactionId: tx.id,
            needsAttention: true,
            attentionNote: note,
          }),
        (updated) =>
          applyUpdate(updated, {
            flaggedAt: new Date().toISOString(),
            flaggedByName: currentStaffName,
          }),
      );
    // Raising or updating a flag emails the dealer the note — gate it.
    setConfirm(
      already
        ? {
            heading: "Update note?",
            body: `Update the attention note on ${dealRef(tx)}, ${describeVehicle(tx)}? This emails ${tx.dealershipName} the new note.`,
            confirmLabel: "Update note",
            run: go,
          }
        : {
            heading: "Flag for attention?",
            body: `Flag ${dealRef(tx)}, ${describeVehicle(tx)}, for attention? This emails ${tx.dealershipName} the note.`,
            confirmLabel: "Send flag",
            run: go,
          },
    );
  }

  function clearFlag(tx: StaffDealerTransaction) {
    // Clearing does NOT email (the action only notifies when raising) — but it
    // changes what the dealer sees, so confirm it and say so honestly.
    setConfirm({
      heading: "Clear flag?",
      body: `Clear the attention flag on ${dealRef(tx)}, ${describeVehicle(tx)}? ${tx.dealershipName} will no longer see it flagged.`,
      confirmLabel: "Clear flag",
      run: () =>
        runMutation(
          () =>
            updateTransactionAttention({
              transactionId: tx.id,
              needsAttention: false,
              attentionNote: null,
            }),
          (updated) =>
            applyUpdate(updated, { flaggedAt: null, flaggedByName: null }),
        ),
    });
  }

  // --- Open / close --------------------------------------------------------

  function openDeal(id: string, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setError(null);
    setSelectedId(id);
  }

  function closeDeal() {
    setSelectedId(null);
    openerRef.current?.focus();
  }

  // --- Derived list --------------------------------------------------------

  const counts = useMemo(
    () => ({
      active: rows.filter((r) => r.status !== "picked_up").length,
      attention: rows.filter((r) => r.needs_attention).length,
      ready: rows.filter((r) => r.status === "ready_for_pickup").length,
      all: rows.length,
    }),
    [rows],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const passesFilter =
        filter === "attention"
          ? r.needs_attention
          : filter === "ready"
            ? r.status === "ready_for_pickup"
            : filter === "all"
              ? true
              : r.status !== "picked_up";
      if (!passesFilter) return false;
      if (!q) return true;
      const hay = [
        r.dealershipName,
        describeVehicle(r),
        r.stock_number,
        dealRef(r),
        r.transaction_type,
        r.vin,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter, query]);

  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "active", label: "Active", count: counts.active },
    { key: "attention", label: "Needs attention", count: counts.attention },
    { key: "ready", label: "Ready for pickup", count: counts.ready },
    { key: "all", label: "All", count: counts.all },
  ];

  const total = rows.length;
  const resultLabel =
    shown.length === total
      ? `${total} ${total === 1 ? "deal" : "deals"}`
      : `${shown.length} of ${total} ${total === 1 ? "deal" : "deals"}`;

  return (
    <div>
      {/* Toolbar: filter tabs + search */}
      <div className="mb-4 flex flex-col gap-3 border-b border-line sm:flex-row sm:items-end sm:justify-between">
        <div
          className="-mb-px flex items-center gap-1 overflow-x-auto"
          role="group"
          aria-label="Filter deals"
        >
          {chips.map((chip) => {
            const on = filter === chip.key;
            const attn = chip.key === "attention" && chip.count > 0;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                aria-pressed={on}
                className={`inline-flex h-9 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm transition-colors ${
                  on
                    ? "border-ink font-semibold text-ink"
                    : "border-transparent font-medium text-fog hover:text-ink"
                }`}
              >
                {chip.label}
                <span
                  className={`inline-flex h-[19px] min-w-5 items-center justify-center rounded px-1.5 text-[0.7rem] font-semibold tabular-nums ${
                    attn
                      ? "bg-plate/10 text-plate"
                      : on
                        ? "bg-ink/10 text-ink"
                        : "bg-ink/[0.045] text-fog"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative mb-0 sm:mb-2.5">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog/60"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals, dealers, VIN"
            aria-label="Search deals"
            className="h-9 w-full rounded-lg border border-line bg-paper pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-fog/60 focus:border-ink focus:ring-2 focus:ring-ink/10 sm:w-64"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-3 text-sm font-medium text-plate">
          {error}
        </p>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-console">
        <div className="overflow-x-auto">
          <div
            style={gridStyle}
            className="grid h-10 items-center bg-mist pr-3.5 text-[0.65rem] font-semibold uppercase tracking-[0.07em] text-fog/70"
          >
            <span />
            <span className="pl-0.5">Dealer</span>
            <span>Deal</span>
            <span>Service</span>
            <span>Filed</span>
            <span>Age</span>
            <span>Status</span>
            <span>Flag</span>
            <span />
          </div>

          {shown.map((tx) => {
            const flagged = tx.needs_attention;
            const vehicle = describeVehicle(tx);
            return (
              <button
                key={tx.id}
                type="button"
                onClick={(e) => openDeal(tx.id, e.currentTarget)}
                aria-label={`Open deal ${dealRef(tx)}, ${vehicle}, ${tx.dealershipName}${
                  flagged ? ", flagged for attention" : ""
                }`}
                style={gridStyle}
                className={`grid min-h-[58px] w-full items-center border-b border-line pr-3.5 text-left transition-colors last:border-b-0 hover:bg-mist ${
                  selectedId === tx.id ? "bg-mist" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`self-stretch ${flagged ? "bg-plate" : ""}`}
                />
                <span className="truncate pl-0.5 pr-3 text-[0.7rem] font-semibold uppercase tracking-[0.045em] text-fog">
                  {tx.dealershipName}
                </span>
                <span className="flex min-w-0 items-baseline gap-2 pr-3">
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-plate">
                    {dealRef(tx)}
                  </span>
                  <span className="truncate text-sm font-semibold text-ink">
                    {vehicle}
                  </span>
                </span>
                <span className="truncate pr-3 text-sm text-fog">
                  {tx.transaction_type?.trim() || "—"}
                </span>
                <span className="text-sm tabular-nums text-fog">
                  {formatBusinessDate(tx.created_at)}
                </span>
                <span className="text-xs tabular-nums text-fog/70">
                  {ageDays(tx.created_at, today)}d
                </span>
                <span>
                  <span
                    className={`inline-flex h-6 items-center rounded-md px-2.5 text-xs font-semibold ${STATUS_BADGE[tx.status]}`}
                  >
                    {TRANSACTION_STATUS_META[tx.status].label}
                  </span>
                </span>
                <span>
                  {flagged ? (
                    // Compact flag: a red-tinted square badge with "!", tooltip on
                    // hover, and a screen-reader label (the row's aria-label above
                    // also states it). The red left rail is the second cue.
                    <span
                      title="Needs attention"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-plate/20 bg-plate/[0.09] text-sm font-extrabold leading-none text-plate"
                    >
                      <span className="sr-only">Needs attention</span>
                      <span aria-hidden>!</span>
                    </span>
                  ) : null}
                </span>
                <span aria-hidden className="text-right text-lg leading-none text-fog/40">
                  ›
                </span>
              </button>
            );
          })}

          {shown.length === 0 ? (
            <EmptyState
              everEmpty={total === 0}
              onClear={() => {
                setFilter("all");
                setQuery("");
              }}
            />
          ) : null}
        </div>
      </div>

      {/* Footer meta */}
      <div className="mt-3.5 flex items-center justify-between px-0.5">
        <span className="text-xs tabular-nums text-fog/70">{resultLabel}</span>
        <span className="text-xs text-fog/60">
          Dates shown in local time (America/Chicago)
        </span>
      </div>

      <DealerDealPanel
        open={panelOpen}
        tx={panelTx}
        dealRef={panelTx ? dealRef(panelTx) : ""}
        confirmOpen={confirm !== null}
        pending={pending}
        onClose={closeDeal}
        onAdvance={() => selectedTx && advance(selectedTx)}
        onReturn={() => selectedTx && returnPrev(selectedTx)}
        onFlagSubmit={(note) => selectedTx && flagSubmit(selectedTx, note)}
        onClearFlag={() => selectedTx && clearFlag(selectedTx)}
      />

      {confirm ? (
        <ConfirmDialog
          heading={confirm.heading}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          busy={pending}
          onConfirm={onConfirmYes}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Branded empty state — distinguishes "nothing filed yet" from "no matches".
 * Delegates to the shared EmptyState so the staff Dealers tab picks up Remy
 * exactly like every other console tab; it sits inside the table frame, so it
 * renders `bare`.
 */
function EmptyState({
  everEmpty,
  onClear,
}: {
  everEmpty: boolean;
  onClear: () => void;
}) {
  return everEmpty ? (
    <BrandedEmptyState
      bare
      title="No dealer deals yet"
      description="Filed dealer transactions appear here the moment a dealer submits one."
    />
  ) : (
    <BrandedEmptyState
      bare
      title="No deals match this view"
      description="Try a different filter, or clear your search to see every deal in the queue."
      action={
        <button type="button" onClick={onClear} className="btn btn--secondary btn--sm">
          Clear filters
        </button>
      }
    />
  );
}
