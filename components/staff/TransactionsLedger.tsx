"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import {
  getTransactionsForDayAction,
  voidTransaction,
} from "@/lib/transactions/actions";
import { getEntityActivityAction } from "@/lib/activity/actions";
import type { ActivityLogEntry } from "@/lib/activity/types";
import { computeDayTotals } from "@/lib/transactions/totals";
import { centsToCsvDollars, shortId } from "@/lib/transactions/format";
import { formatBusinessDateTime, formatBusinessTime } from "@/lib/transactions/day";
import {
  TRANSACTION_STATUS_META,
  type LedgerRow,
} from "@/lib/transactions/types";
import { getTransactionPath } from "@/lib/checklists";
import { formatCents } from "@/lib/tax/rates";
import { StatTile } from "@/components/console/ConsoleUI";
import { EmptyState } from "@/components/EmptyState";
import { HelpLink } from "@/components/staff/HelpLink";
import { TransactionReport } from "./TransactionReport";

/**
 * The transactions ledger (client): the day's rows in a table, a date picker,
 * day totals, per-row void with a reason, CSV export, and a print button that
 * shows the monochrome reconciliation report (TransactionReport). Money is cents
 * throughout; the report layout separates 88 Title revenue from the state /
 * parish + statutory pass-through.
 */

/** How many columns the table has (for colSpan on the totals / void-form rows). */
const COLS = 11;

function serviceLabel(slug: string): string {
  return getTransactionPath(slug)?.label ?? slug;
}

/** Wrap a CSV cell value and escape embedded quotes. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function TransactionsLedger({
  initialDay,
  today,
  initialRows,
  preparedByName,
  businessName,
  businessAddress,
}: {
  initialDay: string;
  today: string;
  initialRows: LedgerRow[];
  preparedByName: string;
  businessName: string;
  businessAddress: string;
}) {
  const [day, setDay] = useState(initialDay);
  const [rows, setRows] = useState<LedgerRow[]>(initialRows);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  // Void flow: which row is being voided, its reason, and the in-flight state.
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);
  const [voidBusy, startVoid] = useTransition();

  // History affordance: which row's activity is expanded, its loaded entries, and
  // the in-flight state. One filtered select per open (see getEntityActivityAction).
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<ActivityLogEntry[]>([]);
  const [historyBusy, startHistory] = useTransition();

  function toggleHistory(id: string) {
    if (historyId === id) {
      setHistoryId(null);
      return;
    }
    setHistoryId(id);
    setHistory([]);
    startHistory(async () => {
      setHistory(await getEntityActivityAction("transaction", id));
    });
  }

  // Print: stamp a fresh "prepared at" then fire window.print() after re-render,
  // so the report footer shows the moment the report was printed.
  const [preparedAt, setPreparedAt] = useState<string>(() =>
    new Date().toISOString(),
  );
  const [printNonce, setPrintNonce] = useState(0);
  useEffect(() => {
    if (printNonce > 0) window.print();
  }, [printNonce]);

  const totals = useMemo(() => computeDayTotals(rows), [rows]);

  function loadDay(nextDay: string) {
    setError(null);
    setVoidingId(null);
    setHistoryId(null);
    startLoad(async () => {
      setRows(await getTransactionsForDayAction(nextDay));
    });
  }

  function onDateChange(next: string) {
    if (!next) return;
    setDay(next);
    loadDay(next);
  }

  function confirmVoid(id: string) {
    const reason = voidReason.trim();
    if (!reason) {
      setVoidError("Enter a reason for the void.");
      return;
    }
    setVoidError(null);
    startVoid(async () => {
      const result = await voidTransaction(id, reason);
      if (!result.ok) {
        setVoidError(result.error ?? "Could not void the transaction.");
        return;
      }
      setRows(await getTransactionsForDayAction(day));
      setVoidingId(null);
      setVoidReason("");
      // Keep an open history in sync — it should now include the void event.
      if (historyId === id) {
        setHistory(await getEntityActivityAction("transaction", id));
      }
    });
  }

  function onExportCsv() {
    const header = [
      "Time",
      "Short ID",
      "Customer",
      "Service type",
      "Service fees",
      "Tax",
      "Statutory",
      "Total collected",
      "Processed by",
      "Status",
      "Void reason",
    ];
    const body = rows.map((r) => [
      formatBusinessTime(r.created_at),
      shortId(r.id),
      r.customerName ?? "",
      serviceLabel(r.service_type),
      centsToCsvDollars(r.service_fee_total_cents),
      centsToCsvDollars(r.tax_cents ?? 0),
      centsToCsvDollars(r.statutory_tag_fee_cents),
      centsToCsvDollars(r.total_collected_cents),
      r.processedByName,
      r.status,
      r.void_reason ?? "",
    ]);
    const csv = [header, ...body]
      .map((cols) => cols.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `88title-transactions-${day}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function onPrint() {
    setPreparedAt(new Date().toISOString());
    setPrintNonce((n) => n + 1);
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-5 print:hidden">
        {/* Controls */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block">
            <span className="block text-sm font-semibold text-ink">Day</span>
            <input
              type="date"
              value={day}
              max={today}
              onChange={(event) => onDateChange(event.target.value)}
              className="field date-field mt-1 rounded-xl border border-line bg-white px-3 py-2.5 font-semibold text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onExportCsv}
              disabled={rows.length === 0}
              className="btn btn--secondary"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={onPrint}
              disabled={rows.length === 0}
              className="btn btn--secondary"
            >
              Print report
            </button>
          </div>
        </div>

        {/* Day totals: 88 Title revenue vs the state / parish pass-through. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Total collected"
            value={formatCents(totals.totalCollectedCents)}
          />
          <StatTile
            label="88 Title revenue"
            value={formatCents(totals.serviceFeeRevenueCents)}
          />
          <StatTile
            label="Pass-through (tax + $23)"
            value={formatCents(totals.passThroughCents)}
          />
          <StatTile
            label="Transactions"
            value={
              <span className="flex items-baseline gap-1.5">
                {totals.count}
                {totals.voidedCount > 0 ? (
                  <span className="text-sm font-semibold text-fog">
                    ({totals.voidedCount} voided)
                  </span>
                ) : null}
              </span>
            }
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-plate">
            {error}
          </p>
        ) : null}

        {/* Ledger table (scrolls horizontally on a phone). */}
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[62rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-mist text-left text-xs uppercase tracking-wide text-fog">
                <th className="px-3 py-2.5 font-semibold">Time</th>
                <th className="px-3 py-2.5 font-semibold">ID</th>
                <th className="px-3 py-2.5 font-semibold">Customer</th>
                <th className="px-3 py-2.5 font-semibold">Service</th>
                <th className="px-3 py-2.5 text-right font-semibold">Svc fees</th>
                <th className="px-3 py-2.5 text-right font-semibold">Tax</th>
                <th className="px-3 py-2.5 text-right font-semibold">Statutory</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                <th className="px-3 py-2.5 font-semibold">By</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLS} className="px-3 py-6">
                    {loading ? (
                      <p className="text-center text-sm text-fog">Loading…</p>
                    ) : (
                      <EmptyState
                        bare
                        size="compact"
                        title="No transactions recorded for this day"
                        description="Pick another date above to see a different day."
                      />
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const voided = r.status === "voided";
                  const money = (cents: number) => (
                    <span
                      className={
                        voided ? "text-fog line-through" : "tabular-nums"
                      }
                    >
                      {formatCents(cents)}
                    </span>
                  );
                  return (
                    <Fragment key={r.id}>
                    <tr
                      className={`border-b border-line align-top ${
                        voided ? "text-fog" : "text-ink"
                      }`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {formatBusinessTime(r.created_at)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {shortId(r.id)}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.customerName ?? (
                          <span className="text-fog">Not linked</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {serviceLabel(r.service_type)}
                        {voided && r.void_reason ? (
                          <span className="block text-xs italic text-plate">
                            Void: {r.void_reason}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {money(r.service_fee_total_cents)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {money(r.tax_cents ?? 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {money(r.statutory_tag_fee_cents)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {money(r.total_collected_cents)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {r.processedByName}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge voided={voided} label={statusText(r)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleHistory(r.id)}
                            aria-expanded={historyId === r.id}
                            className="btn btn--secondary btn--sm"
                          >
                            History
                          </button>
                          {voided ? null : voidingId === r.id ? (
                            <span className="text-xs text-fog">Voiding…</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidingId(r.id);
                                setVoidReason("");
                                setVoidError(null);
                              }}
                              className="btn btn--danger btn--sm"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {historyId === r.id ? (
                      <tr className="border-b border-line bg-mist/40">
                        <td colSpan={COLS} className="px-3 py-3">
                          <TransactionHistory
                            loading={historyBusy}
                            entries={history}
                          />
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                  );
                })
              )}

              {/* Inline void-reason form for the selected row. */}
              {voidingId ? (
                <tr className="border-b border-line bg-plate/5">
                  <td colSpan={COLS} className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="void-reason"
                        className="text-sm font-semibold text-ink"
                      >
                        Void reason
                      </label>
                      <HelpLink anchor="voiding" label="voiding a transaction" />
                      <input
                        id="void-reason"
                        type="text"
                        value={voidReason}
                        autoFocus
                        onChange={(event) => setVoidReason(event.target.value)}
                        placeholder="Why is this being voided?"
                        className="field min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => confirmVoid(voidingId)}
                        disabled={voidBusy}
                        className="btn btn--primary btn--sm"
                      >
                        {voidBusy ? "Voiding…" : "Confirm void"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVoidingId(null);
                          setVoidReason("");
                          setVoidError(null);
                        }}
                        disabled={voidBusy}
                        className="btn btn--secondary btn--sm"
                      >
                        Cancel
                      </button>
                    </div>
                    {voidError ? (
                      <p role="alert" className="mt-2 text-sm font-medium text-plate">
                        {voidError}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ) : null}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-ink font-semibold text-ink">
                  <td colSpan={4} className="px-3 py-3">
                    Day totals
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCents(totals.serviceFeeRevenueCents)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCents(totals.taxCents)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCents(totals.statutoryCents)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCents(totals.totalCollectedCents)}
                  </td>
                  <td colSpan={3} className="px-3 py-3" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      {/* Print-only reconciliation report. */}
      <TransactionReport
        day={day}
        rows={rows}
        totals={totals}
        preparedByName={preparedByName}
        preparedAt={preparedAt}
        businessName={businessName}
        businessAddress={businessAddress}
      />
    </>
  );
}

/** The status text for a row (voided rows read "Voided"). */
function statusText(row: LedgerRow): string {
  return TRANSACTION_STATUS_META[row.status].label;
}

/**
 * The inline "History" panel for one transaction: its append-only activity_log
 * entries (recorded / voided), newest first, each with the acting staff name and
 * the moment it happened. Read-only.
 */
function TransactionHistory({
  loading,
  entries,
}: {
  loading: boolean;
  entries: ActivityLogEntry[];
}) {
  if (loading) {
    return <p className="text-xs text-fog">Loading history…</p>;
  }
  if (entries.length === 0) {
    return <p className="text-xs text-fog">No recorded history.</p>;
  }
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fog">
        History
      </p>
      <ul className="flex flex-col gap-1.5">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="whitespace-nowrap font-medium tabular-nums text-fog">
              {formatBusinessDateTime(e.created_at)}
            </span>
            <span className="whitespace-nowrap font-semibold text-ink">
              {e.actorName}
            </span>
            <span className="text-ink">{e.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ voided, label }: { voided: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
        voided
          ? "border-plate/30 bg-plate/5 text-plate"
          : "border-ink/15 bg-mist text-ink"
      }`}
    >
      {label}
    </span>
  );
}
