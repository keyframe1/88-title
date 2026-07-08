import Link from "next/link";
import type { ReactNode } from "react";
import { formatCents } from "@/lib/tax/rates";
import { getTransactionPath } from "@/lib/checklists";
import { formatBusinessDateTime } from "@/lib/transactions/day";
import { shortId } from "@/lib/transactions/format";
import {
  TRANSACTION_STATUS_META,
  type LedgerRow,
} from "@/lib/transactions/types";
import {
  CUSTOMER_ID_TYPE_LABEL,
  type CustomerDetail,
  type CustomerSummary,
  type VehicleDetail,
  type VehicleSummary,
} from "@/lib/records/types";
import { maskFromLast4, vehicleLabel } from "@/lib/records/normalize";
import { ConsolePanel } from "@/components/console/ConsoleUI";
import { CopyButton } from "@/components/console/CopyButton";
import { EmptyState } from "@/components/EmptyState";

/**
 * Customer & vehicle detail (hub) views - the point where the flat records lists
 * become a connected picture: a record, the transactions it appears on, the
 * other records it has been paired with (derived purely from that transaction
 * history - a title office has no ownership FK), and the two operational actions
 * that start real work from here (open the fee calculator or the DPSMV forms with
 * this record pre-selected).
 *
 * These are presentational Server Components (no state); the only client islands
 * are the copy buttons. Everything is already staff-gated by the page that
 * renders it (getDealerContext + RLS), and the full ID number is never passed in
 * - the contact block shows only the masked last 4, the same gated pattern the
 * list rows use.
 */

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

/** "← Records" back link above the detail header. */
function BackToRecords() {
  return (
    <Link
      href="/staff/records"
      className="inline-flex items-center gap-1 text-sm font-semibold text-fog underline-offset-2 hover:text-plate hover:underline"
    >
      <span aria-hidden="true">&larr;</span> Records
    </Link>
  );
}

/**
 * The two operational actions the hub exists for. Both reuse the existing
 * pre-selection plumbing: Fees and Forms accept a ?customer= / ?vehicle= param
 * and open with that record already chosen. Prominent, using the flat button
 * system (Start transaction is the one loud primary action).
 */
function OperationalActions({
  startHref,
  formsHref,
}: {
  startHref: string;
  formsHref: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={startHref} className="btn btn--primary">
        Start transaction
      </Link>
      <Link href={formsHref} className="btn btn--secondary">
        Generate forms
      </Link>
    </div>
  );
}

/** One labeled fact in a contact / info block, with an optional copy affordance. */
function Fact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
        {label}
      </dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

/** A titled panel section with a quiet caption on the right (record counts). */
function DetailSection({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
        {caption ? <p className="console-caption">{caption}</p> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Transaction history (the ledger row treatment, read-only)
// ---------------------------------------------------------------------------

function serviceLabel(slug: string): string {
  return getTransactionPath(slug)?.label ?? slug;
}

function StatusBadge({ row }: { row: LedgerRow }) {
  const voided = row.status === "voided";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
        voided
          ? "border-plate/30 bg-plate/5 text-plate"
          : "border-ink/15 bg-mist text-ink"
      }`}
    >
      {TRANSACTION_STATUS_META[row.status].label}
    </span>
  );
}

/**
 * A record's transaction history, in the ledger's row treatment: date, service,
 * total, status, processed by. Read-only here - voiding and the per-row activity
 * trail live on the Transactions tab (there is no per-transaction deep link, so
 * the history renders inline). Voided rows strike through and show their reason,
 * exactly as the ledger does.
 */
function TransactionHistory({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        size="compact"
        title="No transactions yet"
        description="Transactions recorded for this record will appear here."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-console">
      <table className="w-full min-w-[38rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-mist text-left text-xs uppercase tracking-wide text-fog">
            <th className="px-3 py-2.5 font-semibold">Date</th>
            <th className="px-3 py-2.5 font-semibold">ID</th>
            <th className="px-3 py-2.5 font-semibold">Service</th>
            <th className="px-3 py-2.5 text-right font-semibold">Total</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold">By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const voided = r.status === "voided";
            return (
              <tr
                key={r.id}
                className={`border-b border-line align-top last:border-b-0 ${
                  voided ? "text-fog" : "text-ink"
                }`}
              >
                <td className="whitespace-nowrap px-3 py-2.5">
                  {formatBusinessDateTime(r.created_at)}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">{shortId(r.id)}</td>
                <td className="px-3 py-2.5">
                  {serviceLabel(r.service_type)}
                  {voided && r.void_reason ? (
                    <span className="block text-xs italic text-plate">
                      Void: {r.void_reason}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">
                  <span className={voided ? "line-through" : "tabular-nums"}>
                    {formatCents(r.total_collected_cents)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge row={r} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {r.processedByName}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Associated-record lists (dense console rows, linked to the other detail view)
// ---------------------------------------------------------------------------

function AssociatedVehicles({ vehicles }: { vehicles: VehicleSummary[] }) {
  if (vehicles.length === 0) {
    return (
      <EmptyState
        size="compact"
        title="No vehicles yet"
        description="Vehicles from this customer's transactions will appear here."
      />
    );
  }
  return (
    <ul className="console-list">
      {vehicles.map((v) => (
        <li key={v.id} className="group console-row console-row--hover">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <Link
              href={`/staff/records/vehicles/${v.id}`}
              className="truncate font-semibold text-ink underline-offset-2 hover:text-plate hover:underline focus:outline-none focus-visible:text-plate focus-visible:underline"
            >
              {vehicleLabel(v)}
            </Link>
            <span className="flex min-w-0 items-center gap-1">
              <span className="break-all font-mono text-sm tracking-tight text-fog">
                {v.vin}
              </span>
              <CopyButton value={v.vin} label="VIN" />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AssociatedCustomers({ customers }: { customers: CustomerSummary[] }) {
  if (customers.length === 0) {
    return (
      <EmptyState
        size="compact"
        title="No customers yet"
        description="Customers from this vehicle's transactions will appear here."
      />
    );
  }
  return (
    <ul className="console-list">
      {customers.map((c) => (
        <li key={c.id} className="group console-row console-row--hover">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <Link
              href={`/staff/records/customers/${c.id}`}
              className="truncate font-semibold text-ink underline-offset-2 hover:text-plate hover:underline focus:outline-none focus-visible:text-plate focus-visible:underline"
            >
              {c.full_name}
            </Link>
            <span className="min-w-0 truncate text-sm text-fog">
              {c.parish ? `${c.parish} Parish` : c.city ? c.city : ""}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Customer detail
// ---------------------------------------------------------------------------

export function CustomerDetailView({ detail }: { detail: CustomerDetail }) {
  const { customer: c, transactions, vehicles } = detail;
  const cityStateZip = [c.city, c.state, c.postal_code]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
  const hasContact = Boolean(c.phone || c.email);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <BackToRecords />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
              Customer record
            </p>
            <h1 className="mt-1 truncate text-2xl font-extrabold sm:text-3xl">
              {c.full_name}
            </h1>
          </div>
          <OperationalActions
            startHref={`/staff/fees?customer=${encodeURIComponent(c.id)}`}
            formsHref={`/staff/forms?customer=${encodeURIComponent(c.id)}`}
          />
        </div>
      </div>

      {/* Contact */}
      <ConsolePanel>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Phone">
            {c.phone ? (
              <span className="group inline-flex items-center gap-1.5">
                <a
                  href={`tel:${c.phone}`}
                  className="underline-offset-2 hover:text-plate hover:underline"
                >
                  {c.phone}
                </a>
                <CopyButton value={c.phone} label="phone" />
              </span>
            ) : (
              <span className="text-fog">Not on file</span>
            )}
          </Fact>
          <Fact label="Email">
            {c.email ? (
              <span className="group inline-flex min-w-0 items-center gap-1.5">
                <span className="truncate">{c.email}</span>
                <CopyButton value={c.email} label="email" />
              </span>
            ) : (
              <span className="text-fog">Not on file</span>
            )}
          </Fact>
          <Fact label="Address">
            {c.address_line1 || cityStateZip ? (
              <span className="block">
                {c.address_line1 ? <span>{c.address_line1}</span> : null}
                {c.address_line2 ? (
                  <span className="block">{c.address_line2}</span>
                ) : null}
                {cityStateZip ? (
                  <span className="block text-sm text-fog">{cityStateZip}</span>
                ) : null}
              </span>
            ) : (
              <span className="text-fog">Not on file</span>
            )}
          </Fact>
          <Fact label="Parish (domicile)">
            {c.parish ? (
              `${c.parish} Parish`
            ) : (
              <span className="text-fog">Not on file</span>
            )}
          </Fact>
          <Fact label="ID on file">
            {c.id_last4 ? (
              <span>
                {c.id_type ? CUSTOMER_ID_TYPE_LABEL[c.id_type] : "ID"}{" "}
                <span className="font-mono">{maskFromLast4(c.id_last4)}</span>
                {c.id_state ? (
                  <span className="text-fog"> · {c.id_state}</span>
                ) : null}
              </span>
            ) : (
              <span className="text-fog">Not recorded</span>
            )}
          </Fact>
          {c.notes ? (
            <Fact label="Notes">
              <span className="whitespace-pre-line">{c.notes}</span>
            </Fact>
          ) : null}
        </dl>
        {!hasContact ? (
          <p className="mt-4 text-xs text-fog">
            No phone or email on file for this customer.
          </p>
        ) : null}
      </ConsolePanel>

      {/* Associated vehicles (from transaction history) */}
      <DetailSection
        title="Vehicles from past transactions"
        caption={vehicles.length > 0 ? `${vehicles.length}` : undefined}
      >
        <AssociatedVehicles vehicles={vehicles} />
      </DetailSection>

      {/* Transaction history */}
      <DetailSection
        title="Transaction history"
        caption={transactions.length > 0 ? `${transactions.length}` : undefined}
      >
        <TransactionHistory rows={transactions} />
      </DetailSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vehicle detail
// ---------------------------------------------------------------------------

export function VehicleDetailView({ detail }: { detail: VehicleDetail }) {
  const { vehicle: v, transactions, customers } = detail;
  const bodyColor = [v.body_style, v.color]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" · ");

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <BackToRecords />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
              Vehicle record
            </p>
            <h1 className="mt-1 truncate text-2xl font-extrabold sm:text-3xl">
              {vehicleLabel(v)}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-sm tracking-tight text-fog">
              <span className="break-all">{v.vin}</span>
              <CopyButton value={v.vin} label="VIN" />
            </p>
          </div>
          <OperationalActions
            startHref={`/staff/fees?vehicle=${encodeURIComponent(v.id)}`}
            formsHref={`/staff/forms?vehicle=${encodeURIComponent(v.id)}`}
          />
        </div>
      </div>

      {/* Vehicle info */}
      <ConsolePanel>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Fact label="Year">
            {v.year ?? <span className="text-fog">n/a</span>}
          </Fact>
          <Fact label="Make">
            {v.make ?? <span className="text-fog">n/a</span>}
          </Fact>
          <Fact label="Model">
            {v.model ?? <span className="text-fog">n/a</span>}
          </Fact>
          <Fact label="Body / color">
            {bodyColor || <span className="text-fog">n/a</span>}
          </Fact>
          {v.notes ? (
            <div className="col-span-2 sm:col-span-4">
              <Fact label="Notes">
                <span className="whitespace-pre-line">{v.notes}</span>
              </Fact>
            </div>
          ) : null}
        </dl>
      </ConsolePanel>

      {/* Associated customers (from transaction history) */}
      <DetailSection
        title="Customers from past transactions"
        caption={customers.length > 0 ? `${customers.length}` : undefined}
      >
        <AssociatedCustomers customers={customers} />
      </DetailSection>

      {/* Transaction history */}
      <DetailSection
        title="Transaction history"
        caption={transactions.length > 0 ? `${transactions.length}` : undefined}
      >
        <TransactionHistory rows={transactions} />
      </DetailSection>
    </div>
  );
}
