"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { OMV_DISCLOSURE, PUBLIC_TAG_FEE, serviceFees } from "@/lib/services";
import {
  calculateFees,
  formatCents,
  formatPercent,
  RATES_VERIFIED,
} from "@/lib/tax/rates";
import type { RateBook, ResolvedRate } from "@/lib/tax/types";
import {
  searchCustomersAction,
  searchVehiclesAction,
} from "@/lib/records/actions";
import { vehicleLabel } from "@/lib/records/normalize";
import type { CustomerSummary, VehicleSummary } from "@/lib/records/types";
import { transactionPaths } from "@/lib/checklists";
import { recordTransaction } from "@/lib/transactions/actions";
import type { RecordTransactionResult } from "@/lib/transactions/types";
import type { DpsmvFormKind } from "@/lib/forms/fields";
import { ConsolePanel, SectionHeading } from "@/components/console/ConsoleUI";
import { CopyButton } from "@/components/console/CopyButton";
import { HelpLink } from "@/components/staff/HelpLink";

/**
 * A check-in handed to the transaction workspace as a seam: the row's id (to link
 * the future transaction), its service type, its display ticket, and any
 * customer/vehicle record already linked to it (pre-selected in the picker).
 * Kept generic - a check-in -> transaction handoff, not tied to any intake shape.
 */
export interface LinkedCheckin {
  id: string;
  serviceType: string;
  ticketCode: string;
  customer: CustomerSummary | null;
  vehicle: VehicleSummary | null;
}

/**
 * Staff-only Transaction workspace (client) - the merged Fees + Forms tab.
 *
 * One customer/vehicle selection at the top (a search-driven picker, no preload)
 * drives BOTH halves of a counter transaction:
 *   1. the fee & tax calculator (domicile-based tax + 88 Title fees + the
 *      statutory $23), where a transaction is recorded onto the day's ledger, and
 *   2. document generation (the real DPSMV forms), filled from the same records.
 *
 * The two used to be separate tabs with their own duplicate pickers; here the
 * selection is chosen once and shared. Everything stays staff-gated server-side
 * (is_staff() + RLS); nothing here is customer-facing. The statutory $23 public
 * tag fee keeps its own discrete, never-merged line on the calculator, with the
 * OMV disclosure - the same compliance rule the customer fee page follows.
 */
export function TransactionConsole({
  rateBook,
  linkedCheckin = null,
  initialCustomer = null,
  initialVehicle = null,
  today,
}: {
  rateBook: RateBook;
  linkedCheckin?: LinkedCheckin | null;
  /** A customer pre-selected via a records / queue handoff (?customer= / ?checkin=). */
  initialCustomer?: CustomerSummary | null;
  /** A vehicle pre-selected via a records / queue handoff (?vehicle= / ?checkin=). */
  initialVehicle?: VehicleSummary | null;
  /** Today (business day) as YYYY-MM-DD, the default date on the documents. */
  today: string;
}) {
  // The record to start on: a linked check-in already carries its own customer /
  // vehicle, so it wins; otherwise a bare record pre-selected from a records
  // detail (Start transaction) seeds the pickers. Both halves read this one pair.
  const seedCustomer = linkedCheckin?.customer ?? initialCustomer ?? null;
  const seedVehicle = linkedCheckin?.vehicle ?? initialVehicle ?? null;

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummary | null>(seedCustomer);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummary | null>(
    seedVehicle,
  );

  const linkedServiceLabel = linkedCheckin
    ? (transactionPaths.find((p) => p.slug === linkedCheckin.serviceType)
        ?.label ?? linkedCheckin.serviceType)
    : "";

  return (
    <div className="mt-8 space-y-12">
      {/* Linked check-in (arrived here via "Start transaction" on the queue).
          A recorded transaction will attach to this check-in. */}
      {linkedCheckin ? (
        <div className="rounded-2xl border border-ink/25 bg-ink/[0.03] px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold text-ink">
              Linked to check-in {linkedCheckin.ticketCode}
            </span>
            <span className="text-fog"> · {linkedServiceLabel}</span>
          </p>
          <p className="mt-0.5 text-xs text-fog">
            Recording a transaction below will attach it to this check-in.
          </p>
        </div>
      ) : null}

      {/* ---- Shared selection: chosen once, drives both sections ---------- */}
      <ConsolePanel>
        <SectionHeading
          title="Customer & vehicle"
          description="Search a saved customer and vehicle once. Both the fee calculator and the documents below use this selection. Optional, but it sets the parish and fills the forms."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <RecordPicker<CustomerSummary>
            label="Customer"
            placeholder="Search by name, phone, or email"
            selection={selectedCustomer}
            selectionLabel={(c) =>
              `${c.full_name}${c.parish ? ` · ${c.parish}` : ""}`
            }
            search={searchCustomersAction}
            onSelect={setSelectedCustomer}
            getKey={(c) => c.id}
            renderItem={(c) => (
              <>
                <span className="font-semibold text-ink">{c.full_name}</span>
                {c.parish ? (
                  <span className="ml-2 text-sm text-fog">{c.parish}</span>
                ) : null}
                {c.id_last4 ? (
                  <span className="ml-2 font-mono text-xs text-fog">
                    ••••{c.id_last4}
                  </span>
                ) : null}
              </>
            )}
          />

          <RecordPicker<VehicleSummary>
            label="Vehicle"
            placeholder="Search by VIN, make, or model"
            selection={selectedVehicle}
            selectionLabel={(v) => `${vehicleLabel(v)} · ${v.vin}`}
            search={searchVehiclesAction}
            onSelect={setSelectedVehicle}
            getKey={(v) => v.id}
            renderItem={(v) => (
              <>
                <span className="font-semibold text-ink">
                  {vehicleLabel(v)}
                </span>
                <span className="ml-2 font-mono text-xs text-fog">{v.vin}</span>
              </>
            )}
          />
        </div>

        {selectedVehicle ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-line bg-mist/50 p-3 text-sm sm:grid-cols-4">
            <VehicleFact
              label="VIN"
              value={selectedVehicle.vin}
              mono
              wide
              copyable
            />
            <VehicleFact
              label="Year"
              value={selectedVehicle.year?.toString() ?? null}
            />
            <VehicleFact label="Make" value={selectedVehicle.make} />
            <VehicleFact label="Model" value={selectedVehicle.model} />
            <VehicleFact label="Body" value={selectedVehicle.body_style} />
            <VehicleFact label="Color" value={selectedVehicle.color} />
          </dl>
        ) : null}
      </ConsolePanel>

      {/* ---- 1. Fees & tax (records a transaction) ----------------------- */}
      <section id="transaction-fees" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Step 1"
          title="Fees & tax"
          description="Domicile-based tax plus 88 Title service fees and the statutory tag fee. Record it onto the day's ledger."
        />
        <FeeCalculatorSection
          rateBook={rateBook}
          linkedCheckin={linkedCheckin}
          customer={selectedCustomer}
          vehicle={selectedVehicle}
        />
      </section>

      {/* ---- 2. Documents ------------------------------------------------ */}
      <section id="transaction-documents" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Step 2"
          title="Documents"
          description="Fill the real OMV forms from the customer and vehicle above. A gift swaps the Bill of Sale for an Act of Donation."
        />
        <DocumentsSection
          rateBook={rateBook}
          today={today}
          customer={selectedCustomer}
          vehicle={selectedVehicle}
        />
      </section>
    </div>
  );
}

// ===========================================================================
// 1. Fee & tax calculator (with the record-transaction seam)
// ===========================================================================

/**
 * The fee calculator half. The customer / vehicle come in as props (the shared
 * selection above); everything else - the buyer parish, the vehicle figures, the
 * 88 Title fees, and the itemized breakdown - lives here, plus the "record this
 * onto the day's ledger" capture. Picking a customer up top sets the buyer parish
 * from their domicile; the clerk can still override it.
 */
function FeeCalculatorSection({
  rateBook,
  linkedCheckin,
  customer,
  vehicle,
}: {
  rateBook: RateBook;
  linkedCheckin: LinkedCheckin | null;
  customer: CustomerSummary | null;
  vehicle: VehicleSummary | null;
}) {
  const defaultParish =
    rateBook.parishes.find((parish) => parish.name === "Jefferson") ??
    rateBook.parishes[0] ??
    null;

  // Seed the buyer parish from the customer's domicile (falling back to the
  // default) so the initial render already reflects the pre-selected record.
  const seedParish = customer?.parish
    ? (rateBook.parishes.find(
        (p) => p.name.toLowerCase() === customer.parish?.toLowerCase(),
      ) ?? null)
    : null;

  const [parishName, setParishName] = useState<string>(
    (seedParish ?? defaultParish)?.name ?? "",
  );
  const [districtNames, setDistrictNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [sellingPrice, setSellingPrice] = useState("");
  const [tradeIn, setTradeIn] = useState("");
  const [rebate, setRebate] = useState("");
  const [feeIds, setFeeIds] = useState<Set<string>>(() => new Set());
  const [recordNote, setRecordNote] = useState<string | null>(null);

  // Record-transaction state (the capture seam beside the total).
  const [serviceType, setServiceType] = useState<string>(
    linkedCheckin?.serviceType ?? "",
  );
  const [txnNote, setTxnNote] = useState("");
  const [recording, startRecord] = useTransition();
  const [recordResult, setRecordResult] =
    useState<RecordTransactionResult | null>(null);

  const parish = rateBook.parishes.find((p) => p.name === parishName) ?? null;

  function selectParish(name: string) {
    setParishName(name);
    setDistrictNames(new Set()); // districts belong to a parish; reset on change
  }

  // Set the buyer parish from the shared customer selection: same rule the old
  // picker used, now driven by a customer CHANGE up top. This is the sanctioned
  // "adjust state when a prop changes" pattern (setState guarded during render,
  // not an effect), so it applies before paint with no extra commit and no
  // cascading render. A genuine change re-derives the parish; the initial mount
  // is already seeded above, so the guard skips it. We never invent a rate: an
  // unknown parish leaves the menu for a manual pick.
  const [syncedCustomerId, setSyncedCustomerId] = useState<string | null>(
    customer?.id ?? null,
  );
  if ((customer?.id ?? null) !== syncedCustomerId) {
    setSyncedCustomerId(customer?.id ?? null);
    if (!customer) {
      setRecordNote(null);
    } else if (!customer.parish) {
      setRecordNote(
        `${customer.full_name} has no parish on file. Pick the buyer parish below.`,
      );
    } else {
      const match = rateBook.parishes.find(
        (p) => p.name.toLowerCase() === customer.parish?.toLowerCase(),
      );
      if (match) {
        setParishName(match.name);
        setDistrictNames(new Set()); // districts belong to a parish; reset on change
        setRecordNote(null);
      } else {
        setRecordNote(
          `No tax rate configured for ${customer.parish} Parish. Add it to tax_rates, or pick a parish below.`,
        );
      }
    }
  }

  function toggleDistrict(name: string) {
    setDistrictNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleFee(id: string) {
    setFeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // The jurisdictions whose rates apply to this buyer: state + their parish +
  // any chosen special district. This is the domicile lookup.
  const appliedRates: ResolvedRate[] = useMemo(() => {
    const rates: ResolvedRate[] = [];
    if (rateBook.state) rates.push(rateBook.state);
    if (parish) {
      rates.push({
        level: "parish",
        name: parish.name,
        ratePercent: parish.ratePercent,
        note: parish.note,
      });
      for (const district of parish.districts) {
        if (districtNames.has(district.name)) rates.push(district);
      }
    }
    return rates;
  }, [rateBook.state, parish, districtNames]);

  const chosenFees = serviceFees.filter((fee) => feeIds.has(fee.id));

  const breakdown = useMemo(
    () =>
      calculateFees({
        sellingPriceCents: parseMoneyCents(sellingPrice),
        tradeInCents: parseMoneyCents(tradeIn),
        rebateCents: parseMoneyCents(rebate),
        appliedRates,
        serviceFees: chosenFees.map((fee) => ({
          id: fee.id,
          label: fee.label,
          amountCents: Math.round(fee.amount * 100),
        })),
      }),
    [sellingPrice, tradeIn, rebate, appliedRates, chosenFees],
  );

  // Capture the calculator state as a completed transaction on the day's ledger.
  // The server RE-COMPUTES and freezes the money from these itemized figures, so
  // what is stored is an audit snapshot, never a client-sent total.
  function onRecord() {
    setRecordResult(null);
    startRecord(async () => {
      const result = await recordTransaction({
        serviceType,
        parish: parish?.name ?? null,
        salePriceCents: parseMoneyCents(sellingPrice),
        tradeInCents: parseMoneyCents(tradeIn),
        rebateCents: parseMoneyCents(rebate),
        appliedRates: appliedRates.map((rate) => ({
          level: rate.level,
          name: rate.name,
          ratePercent: rate.ratePercent,
        })),
        serviceFees: chosenFees.map((fee) => ({
          id: fee.id,
          label: fee.label,
          amountCents: Math.round(fee.amount * 100),
        })),
        customerId: customer?.id ?? null,
        vehicleId: vehicle?.id ?? null,
        checkinId: linkedCheckin?.id ?? null,
        notes: txnNote.trim() || null,
      });
      setRecordResult(result);
    });
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
      {/* ---- Left: inputs ------------------------------------------------- */}
      <div className="space-y-6">
        {/* Domicile */}
        <ConsolePanel>
          <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            Buyer&rsquo;s parish (domicile)
          </h3>
          <p className="mt-1 text-sm text-fog">
            Tax is based on the buyer&rsquo;s parish of residence, not 88
            Title&rsquo;s location. Pick where the buyer lives.
          </p>

          {recordNote ? (
            <p className="mt-3 rounded-lg border border-plate/30 bg-plate/5 px-3 py-2 text-sm font-medium text-plate">
              {recordNote}
            </p>
          ) : null}

          {rateBook.parishes.length === 0 ? (
            <p className="mt-3 rounded-lg border border-line bg-mist/60 px-3 py-2 text-sm font-medium text-fog">
              No parishes are configured yet. Add parish rows to tax_rates in the
              Supabase dashboard.
            </p>
          ) : (
            <label className="mt-3 block">
              <span className="sr-only">Buyer&rsquo;s parish</span>
              <select
                value={parishName}
                onChange={(event) => selectParish(event.target.value)}
                className="field select-field w-full rounded-xl border border-line bg-white px-3 py-2.5 pr-10 font-semibold text-ink focus:border-ink focus:outline-none"
              >
                {rateBook.parishes.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({formatPercent(option.ratePercent)} local)
                  </option>
                ))}
              </select>
            </label>
          )}

          {!rateBook.state ? (
            <p className="mt-3 rounded-lg border border-plate/30 bg-plate/5 px-3 py-2 text-sm font-medium text-plate">
              No state rate is configured. Add the state row to tax_rates so the
              state portion is applied.
            </p>
          ) : null}

          {parish && parish.districts.length > 0 ? (
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-ink">
                Special districts in {parish.name}
              </legend>
              <p className="text-xs text-fog">
                Optional. Add any district that applies to the buyer&rsquo;s
                address.
              </p>
              <ul className="mt-2 space-y-2">
                {parish.districts.map((district) => (
                  <li key={district.name}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 hover:border-ink">
                      <input
                        type="checkbox"
                        checked={districtNames.has(district.name)}
                        onChange={() => toggleDistrict(district.name)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-ink">
                          {district.name}
                        </span>
                        <span className="ml-2 text-sm text-fog">
                          {formatPercent(district.ratePercent)}
                        </span>
                        {district.note ? (
                          <span className="mt-0.5 block text-xs text-fog">
                            {district.note}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}
        </ConsolePanel>

        {/* Vehicle figures */}
        <ConsolePanel>
          <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            Vehicle figures
          </h3>
          <p className="mt-1 text-sm text-fog">
            Taxable amount is the selling price less any qualifying trade-in and
            rebate.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MoneyField
              label="Selling price"
              value={sellingPrice}
              onChange={setSellingPrice}
            />
            <MoneyField
              label="Trade-in value"
              hint="Less trade"
              value={tradeIn}
              onChange={setTradeIn}
            />
            <MoneyField
              label="Rebate"
              hint="Less rebate"
              value={rebate}
              onChange={setRebate}
            />
          </div>
        </ConsolePanel>

        {/* Service fees */}
        <ConsolePanel>
          <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            88 Title service fees
          </h3>
          <p className="mt-1 text-sm text-fog">
            Add the services on this transaction. These are 88 Title charges, not
            taxed.
          </p>
          <ul className="mt-4 space-y-2">
            {serviceFees.map((fee) => (
              <li key={fee.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    feeIds.has(fee.id)
                      ? "border-ink bg-mist"
                      : "border-line bg-white hover:border-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={feeIds.has(fee.id)}
                    onChange={() => toggleFee(fee.id)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-ink">{fee.label}</span>
                    {fee.description ? (
                      <span className="mt-0.5 block text-sm text-fog">
                        {fee.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-semibold text-ink">
                    {formatCents(Math.round(fee.amount * 100))}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </ConsolePanel>
      </div>

      {/* ---- Right: itemized breakdown (sticky on desktop) ---------------- */}
      <aside className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line bg-mist p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-fog">
              Total collected at the counter
            </p>
            <p
              className="mt-1 font-display text-4xl font-extrabold text-ink"
              aria-live="polite"
            >
              {formatCents(breakdown.totalCents)}
            </p>
            <p className="mt-1 text-sm text-fog">
              Taxes plus 88 Title service fees plus the statutory tag fee.
            </p>
          </div>

          <div className="space-y-4 p-5 text-sm">
            {/* Taxable base */}
            <div className="space-y-1.5">
              <Row label="Selling price" value={breakdown.sellingPriceCents} />
              <Row
                label="Less trade-in"
                value={breakdown.tradeInCents}
                negative
              />
              <Row label="Less rebate" value={breakdown.rebateCents} negative />
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5 font-semibold text-ink">
                <span>Taxable amount (tax value)</span>
                <span>{formatCents(breakdown.taxableCents)}</span>
              </div>
            </div>

            {/* Tax lines */}
            <div className="space-y-1.5 border-t border-line pt-4">
              {breakdown.taxLines.length === 0 ? (
                <p className="text-fog">No tax rates applied yet.</p>
              ) : (
                breakdown.taxLines.map((line) => (
                  <Row
                    key={`${line.level}-${line.name}`}
                    label={`${taxLineLabel(line.level, line.name)} (${formatPercent(line.ratePercent)})`}
                    value={line.amountCents}
                  />
                ))
              )}
              {breakdown.taxLines.length > 0 ? (
                <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5 font-semibold text-ink">
                  <span>
                    Total tax ({formatPercent(breakdown.combinedRatePercent)})
                  </span>
                  <span>{formatCents(breakdown.totalTaxCents)}</span>
                </div>
              ) : null}
            </div>

            {/* Service fees */}
            {breakdown.serviceFeeLines.length > 0 ? (
              <div className="space-y-1.5 border-t border-line pt-4">
                {breakdown.serviceFeeLines.map((fee) => (
                  <Row key={fee.id} label={fee.label} value={fee.amountCents} />
                ))}
                <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5 font-semibold text-ink">
                  <span>88 Title service fees</span>
                  <span>{formatCents(breakdown.serviceFeesTotalCents)}</span>
                </div>
              </div>
            ) : null}

            {/* Statutory tag fee: its own line, never taxed, never merged. */}
            <div className="border-t border-line pt-4">
              <div className="flex items-baseline justify-between gap-3 font-semibold text-ink">
                <span className="flex min-w-0 items-center gap-1.5">
                  <LockGlyph />
                  {PUBLIC_TAG_FEE.label}
                  <span className="font-normal text-fog">(statutory)</span>
                </span>
                <span>{formatCents(breakdown.publicTagFeeCents)}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fog">
                {OMV_DISCLOSURE}
              </p>
            </div>
          </div>

          {/* The state-vs-agency split. */}
          <div className="border-t-2 border-ink bg-mist p-5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-fog">Pass-through to state / parish</span>
              <span className="font-semibold text-ink">
                {formatCents(breakdown.passThroughCents)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-fog">
              Taxes plus the statutory ${PUBLIC_TAG_FEE.amount} tag fee.
            </p>
            <div className="mt-3 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-fog">88 Title service fees</span>
              <span className="font-semibold text-ink">
                {formatCents(breakdown.agencyCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Record transaction: capture this state onto the day's ledger. */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line bg-mist px-5 py-3">
            <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold text-ink">
              Record transaction
              <HelpLink
                anchor="recording-a-transaction"
                label="recording a transaction"
              />
            </h3>
            <p className="mt-0.5 text-xs text-fog">
              Save this to the day&rsquo;s ledger. The figures are frozen exactly
              as shown.
            </p>
          </div>
          <div className="space-y-3 p-5">
            <label className="block">
              <span className="block text-sm font-semibold text-ink">
                Service type
              </span>
              <select
                value={serviceType}
                onChange={(event) => setServiceType(event.target.value)}
                className="field select-field mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 pr-10 font-semibold text-ink focus:border-ink focus:outline-none"
              >
                <option value="">Select service type</option>
                {transactionPaths.map((path) => (
                  <option key={path.slug} value={path.slug}>
                    {path.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-ink">
                Note <span className="font-normal text-fog">(optional)</span>
              </span>
              <input
                type="text"
                value={txnNote}
                onChange={(event) => setTxnNote(event.target.value)}
                placeholder="Anything to note for the record"
                className="field mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={onRecord}
              disabled={recording || !serviceType}
              className="btn btn--primary w-full"
            >
              {recording
                ? "Recording…"
                : `Record ${formatCents(breakdown.totalCents)}`}
            </button>
            {recordResult?.ok ? (
              <p className="rounded-lg border border-ink/20 bg-mist px-3 py-2 text-sm font-medium text-ink">
                Recorded{" "}
                <span className="font-mono font-semibold">
                  #{recordResult.shortId}
                </span>
                .{" "}
                <Link
                  href="/staff/transactions"
                  className="font-semibold underline underline-offset-2 hover:text-plate"
                >
                  View in the ledger
                </Link>
              </p>
            ) : null}
            {recordResult && !recordResult.ok ? (
              <p role="alert" className="text-sm font-medium text-plate">
                {recordResult.error}
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-fog">
          Internal estimate for staff. No penalty or interest is applied. Rates
          as of {RATES_VERIFIED}.
        </p>
      </aside>
    </div>
  );
}

// ===========================================================================
// 2. Documents (DPSMV form generation)
// ===========================================================================

/**
 * The document-generation half. The customer (buyer / owner / donee) and vehicle
 * come in as props (the shared selection above). Add the counterparty and the
 * transaction figures, and generate print-ready filled PDFs of the real OMV
 * forms. The gift toggle swaps the Bill of Sale for an Act of Donation; the
 * Vehicle Application generates either way. Filling itself is server-side
 * (/api/staff/forms, staff-gated); this is the inputs + the read-only tax preview
 * that mirrors what prints on the application. Recording a transaction lives with
 * the fee calculator above, so after generating we point back to it.
 */
function DocumentsSection({
  rateBook,
  today,
  customer,
  vehicle,
}: {
  rateBook: RateBook;
  today: string;
  customer: CustomerSummary | null;
  vehicle: VehicleSummary | null;
}) {
  const [gift, setGift] = useState(false);
  const [counterpartyName, setCounterpartyName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [amount, setAmount] = useState("");
  const [tradeIn, setTradeIn] = useState("");
  const [rebate, setRebate] = useState("");
  const [tradeVin, setTradeVin] = useState("");
  const [date, setDate] = useState(today);
  const [showLien, setShowLien] = useState(false);
  const [lienName, setLienName] = useState("");
  const [lienAddress, setLienAddress] = useState("");
  const [lienCityStateZip, setLienCityStateZip] = useState("");
  const [mode, setMode] = useState<"open" | "download">("open");

  // Document checklist: what "Generate selected" produces. The Vehicle
  // Application and the transfer document are on by default; the 1806 is opt-in.
  const [wantApplication, setWantApplication] = useState(true);
  const [wantTransfer, setWantTransfer] = useState(true);
  const [want1806, setWant1806] = useState(false);

  const [executionParish, setExecutionParish] = useState(customer?.parish ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Prefill the "Parish of" (where the act is signed) from the buyer's parish
  // whenever the shared customer selection CHANGES (the same setState-during-
  // render pattern the fee section uses, not an effect). Only overwrites when the
  // new customer has a parish, so a clerk's manual entry survives a selection
  // that carries none; the initial mount is already seeded above.
  const [syncedCustomerId, setSyncedCustomerId] = useState<string | null>(
    customer?.id ?? null,
  );
  if ((customer?.id ?? null) !== syncedCustomerId) {
    setSyncedCustomerId(customer?.id ?? null);
    if (customer?.parish) setExecutionParish(customer.parish);
  }

  // Read-only tax preview that matches what the server prints on the Vehicle
  // Application (Tax Value + Tax). Domicile-based: state + the buyer's parish.
  const preview = useMemo(() => {
    const appliedRates: ResolvedRate[] = [];
    if (rateBook.state) appliedRates.push(rateBook.state);
    const parish = rateBook.parishes.find(
      (p) => p.name.toLowerCase() === customer?.parish?.toLowerCase(),
    );
    if (parish) {
      appliedRates.push({
        level: "parish",
        name: parish.name,
        ratePercent: parish.ratePercent,
        note: parish.note,
      });
    }
    const breakdown = calculateFees({
      sellingPriceCents: parseMoneyCents(amount),
      tradeInCents: parseMoneyCents(tradeIn),
      rebateCents: parseMoneyCents(rebate),
      appliedRates,
      serviceFees: [],
    });
    return {
      taxableCents: breakdown.taxableCents,
      taxCents: breakdown.totalTaxCents,
      hasParishRate: Boolean(parish),
      parishKnown: Boolean(customer?.parish),
    };
  }, [rateBook, customer, amount, tradeIn, rebate]);

  async function generate(forms: DpsmvFormKind[]) {
    setError(null);
    if (!customer || !vehicle) {
      setError("Pick a customer and a vehicle above first.");
      return;
    }
    // Open a tab synchronously (inside the click) so it isn't popup-blocked; we
    // navigate it once the PDF is ready. Download mode skips this.
    const win = mode === "open" ? window.open("", "_blank") : null;
    setBusy(true);
    try {
      const res = await fetch("/api/staff/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forms,
          customerId: customer.id,
          vehicleId: vehicle.id,
          gift,
          counterpartyName,
          relationship,
          executionParish,
          amount,
          tradeIn,
          rebate,
          tradeVin,
          date,
          lienholderName: lienName,
          lienholderAddress: lienAddress,
          lienholderCityStateZip: lienCityStateZip,
        }),
      });

      if (!res.ok) {
        win?.close();
        const body: unknown = await res.json().catch(() => null);
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : "Could not generate the form.";
        setError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = parseFilename(res.headers.get("Content-Disposition"));
      setHasGenerated(true);
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else if (win) {
        win.location.href = url;
      } else {
        // Popup was blocked: fall back to a download so the work isn't lost.
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      win?.close();
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const transferLabel = gift ? "Act of Donation" : "Bill of Sale";
  const partyLabel = gift ? "Donor (the giver)" : "Seller";
  const amountLabel = gift ? "Donation value" : "Sale price";
  const ready = Boolean(customer && vehicle);

  // The exact set the single "Generate selected" button produces, in a stable
  // print order (application, transfer, 1806). A "bill-of-sale" request is
  // resolved to an Act of Donation server-side when the gift toggle is set, so
  // the one transfer checkbox covers both documents.
  const selectedForms: DpsmvFormKind[] = [];
  if (wantApplication) selectedForms.push("vehicle-application");
  if (wantTransfer) selectedForms.push("bill-of-sale");
  if (want1806) selectedForms.push("permission-1806");
  const nothingSelected = selectedForms.length === 0;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-6">
        {/* Transaction type */}
        <ConsolePanel>
          <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            Transfer document
          </h3>
          {customer && !customer.parish ? (
            <p className="mt-3 rounded-lg border border-plate/30 bg-plate/5 px-3 py-2 text-sm font-medium text-plate">
              {customer.full_name} has no parish on file, so the owner parish and
              the tax preview will be blank. Add a parish in records to price it.
            </p>
          ) : null}
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 hover:border-ink">
            <input
              type="checkbox"
              checked={gift}
              onChange={(e) => setGift(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
            />
            <span className="min-w-0 flex-1">
              <span className="font-semibold text-ink">
                This is a gift (donation)
              </span>
              <span className="mt-0.5 block text-sm text-fog">
                Generates an Act of Donation instead of a Bill of Sale. The
                Vehicle Application is generated either way.
              </span>
            </span>
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label={partyLabel}
              value={counterpartyName}
              onChange={setCounterpartyName}
              placeholder="Full name"
            />
            {gift ? (
              <TextField
                label="Relationship of donor to donee"
                value={relationship}
                onChange={setRelationship}
                placeholder="e.g. Parent to child"
              />
            ) : null}
            <TextField
              label="Parish where signed"
              hint={'The "Parish of" line. Prefilled from the buyer\'s parish.'}
              value={executionParish}
              onChange={setExecutionParish}
            />
          </div>
        </ConsolePanel>

        {/* Figures */}
        <ConsolePanel>
          <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            Figures
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MoneyField label={amountLabel} value={amount} onChange={setAmount} />
            <MoneyField
              label="Trade-in value"
              value={tradeIn}
              onChange={setTradeIn}
            />
            <MoneyField label="Rebate" value={rebate} onChange={setRebate} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Trade-in VIN"
              hint="Optional. Printed in the trade block."
              value={tradeVin}
              onChange={setTradeVin}
              mono
            />
            <label className="block">
              <span className="block text-sm font-semibold text-ink">
                Date of {gift ? "donation" : "sale"}
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="field date-field mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:border-ink focus:outline-none"
              />
            </label>
          </div>

          {/* Lienholder (optional) */}
          <div className="mt-5 border-t border-line pt-5">
            <button
              type="button"
              onClick={() => setShowLien((v) => !v)}
              className="text-sm font-semibold text-ink underline-offset-2 hover:text-plate hover:underline"
            >
              {showLien ? "Hide lienholder" : "+ Add a lienholder (optional)"}
            </button>
            {showLien ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Lienholder name"
                  value={lienName}
                  onChange={setLienName}
                />
                <TextField
                  label="Lienholder street"
                  value={lienAddress}
                  onChange={setLienAddress}
                />
                <TextField
                  label="Lienholder city / state / ZIP"
                  value={lienCityStateZip}
                  onChange={setLienCityStateZip}
                />
              </div>
            ) : null}
          </div>
        </ConsolePanel>

        {/* What stays blank: the full explanation lives once in the Help
            reference (single source of truth); this is just the pointer. */}
        <section className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <p className="text-sm text-fog">
            Some fields are completed by hand or signed in person on purpose.{" "}
            <Link
              href="/staff/help#forms-blank-by-design"
              className="font-semibold text-ink underline underline-offset-2 hover:text-plate"
            >
              What is left blank, and why
            </Link>
            .
          </p>
          <HelpLink
            anchor="forms-blank-by-design"
            label="fields left blank on purpose"
          />
        </section>
      </div>

      {/* Generate panel (sticky on desktop) */}
      <aside className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line bg-mist p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-fog">
              Tax preview (prints on the application)
            </p>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fog">Tax value</dt>
                <dd className="font-semibold text-ink">
                  {formatCents(preview.taxableCents)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-fog">Tax</dt>
                <dd className="font-semibold text-ink">
                  {formatCents(preview.taxCents)}
                </dd>
              </div>
            </dl>
            {!preview.parishKnown ? (
              <p className="mt-2 text-xs text-fog">
                No parish on file, so no tax is computed.
              </p>
            ) : !preview.hasParishRate ? (
              <p className="mt-2 text-xs text-plate">
                No tax rate configured for {customer?.parish}. Add it in
                tax_rates to price the tax.
              </p>
            ) : null}
          </div>

          <div className="space-y-4 p-5">
            {/* Document checklist: selection IS the checkbox state, so there is
                no per-document button and nothing reads as pre-selected. */}
            <fieldset>
              <legend className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-ink">
                <span>Documents to generate</span>
                <HelpLink
                  anchor="forms-documents"
                  label="generating documents"
                />
              </legend>
              <div className="mt-2 space-y-2">
                <DocCheck
                  checked={wantApplication}
                  onChange={setWantApplication}
                  label="Vehicle Application"
                />
                <DocCheck
                  checked={wantTransfer}
                  onChange={setWantTransfer}
                  label={transferLabel}
                />
                <DocCheck
                  checked={want1806}
                  onChange={setWant1806}
                  label="Permission to Process (1806)"
                />
              </div>
              {/* Honest heads-up, only when the 1806 is actually selected: it
                  prints the owner's DL only when the ID on file is a license. */}
              {want1806 && customer && customer.id_type !== "drivers_license" ? (
                <p className="mt-2 text-xs text-fog">
                  1806: the owner DL line stays blank ({customer.full_name}
                  &rsquo;s ID on file is not a driver&rsquo;s license).
                </p>
              ) : null}
            </fieldset>

            {/* Output format + the single generate action (the only colored
                button in the panel). "Generate selected" produces exactly the
                checked documents, merged into one file. */}
            <div className="border-t border-line pt-4">
              <fieldset>
                <legend className="sr-only">Output format</legend>
                <div className="flex gap-2 rounded-xl border border-line p-1 text-sm font-semibold">
                  <ModeTab
                    active={mode === "open"}
                    onClick={() => setMode("open")}
                  >
                    Open to print
                  </ModeTab>
                  <ModeTab
                    active={mode === "download"}
                    onClick={() => setMode("download")}
                  >
                    Download
                  </ModeTab>
                </div>
              </fieldset>

              <button
                type="button"
                disabled={!ready || busy || nothingSelected}
                onClick={() => generate(selectedForms)}
                className="btn btn--primary mt-3 w-full"
              >
                {busy ? "Generating…" : "Generate selected"}
              </button>

              {!ready ? (
                <p className="mt-2 text-xs text-fog">
                  Select a customer and a vehicle above to generate.
                </p>
              ) : nothingSelected ? (
                <p className="mt-2 text-xs text-fog">
                  Check at least one document to generate.
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="mt-2 text-sm font-medium text-plate">
                  {error}
                </p>
              ) : null}
            </div>

            {/* After generating: point back to the fee calculator to record it
                (recording lives there, once, so the ledger stays single-source). */}
            {hasGenerated ? (
              <div className="mt-1 border-t border-line pt-3">
                <p className="text-sm font-semibold text-ink">Forms generated.</p>
                <p className="mt-0.5 text-xs leading-relaxed text-fog">
                  To put this on the day&rsquo;s ledger, record it in the{" "}
                  <a
                    href="#transaction-fees"
                    className="font-semibold text-ink underline underline-offset-2 hover:text-plate"
                  >
                    Fees &amp; tax
                  </a>{" "}
                  section above (the statutory $23 is included there).
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ===========================================================================
// Shared pieces
// ===========================================================================

/**
 * Search-driven record picker (typeahead). Replaces a preloaded <select>: each
 * settled keystroke runs `search` server-side (the same RLS-gated records search
 * the console uses, capped at 50 rows), so the whole table is never shipped to
 * the client. Selecting an item hands the FULL record to `onSelect`; "None"
 * clears it. Generic so the customer and vehicle pickers share one implementation.
 */
function RecordPicker<T>({
  label,
  placeholder,
  selection,
  selectionLabel,
  search,
  onSelect,
  renderItem,
  getKey,
}: {
  label: string;
  placeholder: string;
  selection: T | null;
  selectionLabel: (item: T) => string;
  search: (query: string) => Promise<T[]>;
  onSelect: (item: T | null) => void;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startSearch] = useTransition();

  // Debounced server search while the menu is open. An empty query returns the
  // most-recently-updated rows, so focusing shows recent records to pick from.
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      startSearch(async () => {
        setResults(await search(query));
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open, search]);

  function choose(item: T | null) {
    onSelect(item);
    setEditing(false);
    setOpen(false);
    setQuery("");
  }

  const showInput = !selection || editing;

  return (
    <div className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>

      {showInput ? (
        <div className="relative mt-1">
          <input
            type="search"
            value={query}
            placeholder={placeholder}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            // Delay close so a result click (mousedown) registers first.
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            className="field w-full rounded-xl border border-line bg-white px-3 py-2.5 font-semibold text-ink focus:border-ink focus:outline-none"
          />
          {open ? (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-white shadow-lg">
              <li>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(null)}
                  className="block w-full px-3 py-2 text-left text-sm font-medium text-fog hover:bg-mist"
                >
                  None
                </button>
              </li>
              {pending && results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-fog">Searching…</li>
              ) : null}
              {!pending && results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-fog">No matches</li>
              ) : null}
              {results.map((item) => (
                <li key={getKey(item)}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(item)}
                    className="block w-full px-3 py-2 text-left hover:bg-mist"
                  >
                    {renderItem(item)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
          <span className="min-w-0 truncate font-semibold text-ink">
            {selection ? selectionLabel(selection) : ""}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setEditing(true);
                setOpen(true);
              }}
              className="text-sm font-semibold text-ink hover:text-plate"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => choose(null)}
              className="text-sm font-semibold text-fog hover:text-plate"
            >
              Clear
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

/** One label/amount line in the breakdown. */
function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-fog">{label}</span>
      <span className="shrink-0 text-ink">
        {negative && value > 0 ? "-" : ""}
        {formatCents(value)}
      </span>
    </div>
  );
}

/** One vehicle detail in the selected-vehicle summary. A VIN is 17 unbroken
 *  chars, so it takes a full-width row (`wide`) and renders monospace, so it
 *  never clips and reads character by character at the counter. */
function VehicleFact({
  label,
  value,
  mono,
  wide,
  copyable,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  wide?: boolean;
  /** Show a one-click copy button beside the value (e.g. the VIN). */
  copyable?: boolean;
}) {
  const hasValue = Boolean(value && value.trim());
  return (
    <div className={`group ${wide ? "col-span-2 sm:col-span-4" : ""}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
        {label}
      </dt>
      <dd className="flex items-center gap-1.5">
        <span
          className={`text-ink ${mono ? "break-all font-mono tracking-tight tabular-nums" : ""}`}
        >
          {hasValue ? value : <span className="text-fog">n/a</span>}
        </span>
        {copyable && hasValue && value ? (
          <CopyButton value={value} label={label} />
        ) : null}
      </dd>
    </div>
  );
}

/** A labeled dollar input with a $ prefix. Stores raw text; parsing is at calc. */
function MoneyField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {hint ? <span className="block text-xs text-fog">{hint}</span> : null}
      <span className="field mt-1 flex items-center rounded-xl border border-line bg-white focus-within:border-ink">
        <span className="pl-3 text-fog">$</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl bg-transparent px-2 py-2.5 text-ink focus:outline-none"
        />
      </span>
    </label>
  );
}

/** A labeled text input used across the documents inputs. */
function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {hint ? <span className="block text-xs text-fog">{hint}</span> : null}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`field mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:border-ink focus:outline-none ${
          mono ? "font-mono uppercase" : ""
        }`}
      />
    </label>
  );
}

/** One document row in the "Documents to generate" checklist. */
function DocCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-ink"
      />
      <span className="min-w-0">{label}</span>
    </label>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-1.5 transition-colors ${
        active ? "bg-ink text-paper" : "text-fog hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Small lock glyph marking the statutory line (mirrors the customer fee page). */
function LockGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-ink"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 2a3.5 3.5 0 0 0-3.5 3.5V8H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-.5V5.5A3.5 3.5 0 0 0 10 2Zm2 6V5.5a2 2 0 1 0-4 0V8h4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Human label for a tax line: state shows its name, parish/district too. */
function taxLineLabel(level: string, name: string): string {
  if (level === "state") return `${name} state tax`;
  if (level === "parish") return `${name} Parish tax`;
  return `${name} district tax`;
}

/** Parse a money input string to integer cents; blank / invalid becomes 0. */
function parseMoneyCents(raw: string): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

/** Pull a filename from a Content-Disposition header, or a sensible default. */
function parseFilename(header: string | null): string {
  const match = header ? /filename="?([^"]+)"?/.exec(header) : null;
  return match ? match[1] : "88title-forms.pdf";
}
