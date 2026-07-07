import { getTransactionPath } from "@/lib/checklists";
import { formatCents } from "@/lib/tax/rates";
import {
  BUSINESS_TZ,
  formatBusinessTime,
  formatDayLabel,
} from "@/lib/transactions/day";
import { shortId } from "@/lib/transactions/format";
import type { DayTotals } from "@/lib/transactions/totals";
import type { LedgerRow } from "@/lib/transactions/types";

/**
 * The printable daily reconciliation report. Rendered on the transactions page
 * but visible only when printing (hidden print:block); the interactive ledger is
 * hidden on print. Monochrome, portrait letter, itemized, with the money split
 * into (a) 88 Title service-fee revenue, (b) tax pass-through, (c) the statutory
 * $23 pass-through, and (d) the grand total.
 *
 * TODO: verify this report's exact layout and required fields against the PTA
 * (public tag agency) contract and the OMV Policy & Procedures once those are
 * available; the structure here is a faithful reconciliation, not a filed form.
 */
function serviceLabel(slug: string): string {
  return getTransactionPath(slug)?.label ?? slug;
}

/** Format a UTC ISO instant as a business-local date + time for the footer. */
function formatBusinessDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function TransactionReport({
  day,
  rows,
  totals,
  preparedByName,
  preparedAt,
  businessName,
  businessAddress,
}: {
  day: string;
  rows: LedgerRow[];
  totals: DayTotals;
  preparedByName: string;
  preparedAt: string;
  businessName: string;
  businessAddress: string;
}) {
  return (
    <div className="hidden text-black print:block">
      <style>{`@page { size: letter portrait; margin: 0.5in; }`}</style>

      <header className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <p className="font-display text-2xl font-extrabold">{businessName}</p>
          <p className="text-sm">{businessAddress}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold uppercase tracking-wide">
            Daily transaction report
          </p>
          <p className="text-sm">{formatDayLabel(day)}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm">No transactions were recorded on this day.</p>
      ) : (
        <table className="mt-4 w-full border-collapse text-left text-[11px] leading-tight">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 pr-2 font-semibold">Time</th>
              <th className="py-1 pr-2 font-semibold">ID</th>
              <th className="py-1 pr-2 font-semibold">Customer</th>
              <th className="py-1 pr-2 font-semibold">Service</th>
              <th className="py-1 pl-2 text-right font-semibold">Svc fees</th>
              <th className="py-1 pl-2 text-right font-semibold">Tax</th>
              <th className="py-1 pl-2 text-right font-semibold">Statutory</th>
              <th className="py-1 pl-2 text-right font-semibold">Total</th>
              <th className="py-1 pl-2 font-semibold">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const voided = r.status === "voided";
              return (
                <tr
                  key={r.id}
                  className={`border-b border-black/30 align-top ${
                    voided ? "line-through" : ""
                  }`}
                >
                  <td className="py-1 pr-2">{formatBusinessTime(r.created_at)}</td>
                  <td className="py-1 pr-2 font-mono">{shortId(r.id)}</td>
                  <td className="py-1 pr-2">{r.customerName ?? "-"}</td>
                  <td className="py-1 pr-2">
                    {serviceLabel(r.service_type)}
                    {voided ? (
                      <span className="block text-[10px] italic no-underline">
                        Void: {r.void_reason}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1 pl-2 text-right tabular-nums">
                    {formatCents(r.service_fee_total_cents)}
                  </td>
                  <td className="py-1 pl-2 text-right tabular-nums">
                    {formatCents(r.tax_cents ?? 0)}
                  </td>
                  <td className="py-1 pl-2 text-right tabular-nums">
                    {formatCents(r.statutory_tag_fee_cents)}
                  </td>
                  <td className="py-1 pl-2 text-right tabular-nums">
                    {formatCents(r.total_collected_cents)}
                  </td>
                  <td className="py-1 pl-2">{r.processedByName}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Totals: the three kinds of money the counter handles, then the grand total. */}
      <div className="mt-5 ml-auto w-72 text-sm">
        <ReportTotal
          label="88 Title service-fee revenue"
          cents={totals.serviceFeeRevenueCents}
        />
        <ReportTotal
          label="Tax pass-through (state / parish)"
          cents={totals.taxCents}
        />
        <ReportTotal
          label="Statutory $23 tag-fee pass-through"
          cents={totals.statutoryCents}
        />
        <div className="mt-1 flex items-baseline justify-between border-t-2 border-black pt-1 font-bold">
          <span>Grand total collected</span>
          <span className="tabular-nums">
            {formatCents(totals.totalCollectedCents)}
          </span>
        </div>
        <p className="mt-1 text-[11px]">
          {totals.count} transaction{totals.count === 1 ? "" : "s"}
          {totals.voidedCount > 0
            ? ` · ${totals.voidedCount} voided (excluded from totals)`
            : ""}
        </p>
      </div>

      <footer className="mt-6 border-t border-black pt-2 text-[11px]">
        Prepared {formatBusinessDateTime(preparedAt)} by {preparedByName}
      </footer>
    </div>
  );
}

function ReportTotal({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span>{label}</span>
      <span className="tabular-nums">{formatCents(cents)}</span>
    </div>
  );
}
