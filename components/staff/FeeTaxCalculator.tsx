"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  OMV_DISCLOSURE,
  PUBLIC_TAG_FEE,
  serviceFees,
} from "@/lib/services";
import {
  calculateFees,
  formatCents,
  formatPercent,
  RATES_VERIFIED,
} from "@/lib/tax/rates";
import type { RateBook, ResolvedRate } from "@/lib/tax/types";
import Link from "next/link";
import {
  searchCustomersAction,
  searchVehiclesAction,
} from "@/lib/records/actions";
import { vehicleLabel } from "@/lib/records/normalize";
import type { CustomerSummary, VehicleSummary } from "@/lib/records/types";
import { transactionPaths } from "@/lib/checklists";
import { recordTransaction } from "@/lib/transactions/actions";
import type { RecordTransactionResult } from "@/lib/transactions/types";
import { ConsolePanel } from "@/components/console/ConsoleUI";
import { CopyButton } from "@/components/console/CopyButton";
import { HelpLink } from "@/components/staff/HelpLink";

/**
 * A check-in handed to the fee calculator as a transaction seam: the row's id
 * (to link the future transaction), its service type, its display ticket, and
 * any customer/vehicle record already linked to it (pre-selected in the picker).
 * Kept generic - a check-in -> fees handoff, not tied to any intake shape.
 */
export interface LinkedCheckin {
  id: string;
  serviceType: string;
  ticketCode: string;
  customer: CustomerSummary | null;
  vehicle: VehicleSummary | null;
}

/**
 * Staff-only fee & tax calculator (client).
 *
 * Back-office tool: a clerk enters the buyer's parish of residence (domicile),
 * the vehicle figures, and the 88 Title services, and gets an itemized
 * breakdown. The tax is DOMICILE-BASED - it uses the buyer's parish rate, not
 * 88 Title's location - and the taxable base is selling price minus qualifying
 * trade-in minus qualifying rebate. Rates come from the staff-only tax_rates
 * table (passed in as a resolved RateBook); nothing here is customer-facing.
 *
 * The statutory $23 public tag fee is shown as its own discrete line, never
 * taxed and never merged, with the OMV disclosure - the same compliance rule the
 * customer fee page follows.
 *
 * Saved records (lib/records/) feed the top of the form via a search-driven
 * picker (no preloading): searching for a stored customer sets the buyer parish
 * from their domicile, and searching for a stored vehicle surfaces its details
 * (for the DPSMV form). Both are optional; the tax math is unchanged either way.
 */
export function FeeTaxCalculator({
  rateBook,
  linkedCheckin = null,
  initialCustomer = null,
  initialVehicle = null,
}: {
  rateBook: RateBook;
  linkedCheckin?: LinkedCheckin | null;
  /** A customer pre-selected via the records -> fees handoff (?customer=<id>). */
  initialCustomer?: CustomerSummary | null;
  /** A vehicle pre-selected via the records -> fees handoff (?vehicle=<id>). */
  initialVehicle?: VehicleSummary | null;
}) {
  const defaultParish =
    rateBook.parishes.find((parish) => parish.name === "Jefferson") ??
    rateBook.parishes[0] ??
    null;

  // The record to start on: a linked check-in already carries its own customer /
  // vehicle, so it wins; otherwise a bare record pre-selected from the records
  // detail (Start transaction) seeds the pickers. Either way the buyer parish
  // starts from the seed customer's domicile (falling back to the default).
  const seedCustomer = linkedCheckin?.customer ?? initialCustomer ?? null;
  const seedVehicle = linkedCheckin?.vehicle ?? initialVehicle ?? null;
  const seedParish = seedCustomer?.parish
    ? (rateBook.parishes.find(
        (p) => p.name.toLowerCase() === seedCustomer.parish?.toLowerCase(),
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
  // The picker carries the full chosen record (not just an id), so the parish
  // and the vehicle details are available without preloading the tables. When we
  // came from the queue or a records detail, that record is pre-selected.
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummary | null>(seedCustomer);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummary | null>(
    seedVehicle,
  );
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

  // Picking a stored customer sets the buyer parish from their domicile. If we
  // have no rate for that parish yet, say so and leave the parish menu for a
  // manual pick - we never invent a rate. (Same logic as before, now sourced
  // from the picked record rather than a preloaded list.)
  function handlePickCustomer(customer: CustomerSummary | null) {
    setSelectedCustomer(customer);
    setRecordNote(null);
    if (!customer) return;
    if (!customer.parish) {
      setRecordNote(
        `${customer.full_name} has no parish on file. Pick the buyer parish below.`,
      );
      return;
    }
    const match = rateBook.parishes.find(
      (p) => p.name.toLowerCase() === customer.parish?.toLowerCase(),
    );
    if (match) {
      selectParish(match.name);
    } else {
      setRecordNote(
        `No tax rate configured for ${customer.parish} Parish. Add it to tax_rates, or pick a parish below.`,
      );
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
        customerId: selectedCustomer?.id ?? null,
        vehicleId: selectedVehicle?.id ?? null,
        checkinId: linkedCheckin?.id ?? null,
        notes: txnNote.trim() || null,
      });
      setRecordResult(result);
    });
  }

  const linkedServiceLabel = linkedCheckin
    ? (transactionPaths.find((p) => p.slug === linkedCheckin.serviceType)
        ?.label ?? linkedCheckin.serviceType)
    : "";

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
      {/* ---- Left: inputs ------------------------------------------------- */}
      <div className="space-y-6">
        {/* Linked check-in (arrived here via "Start transaction" on the queue).
            The transaction we record will attach to this check-in. */}
        {linkedCheckin ? (
          <div className="rounded-2xl border border-ink/25 bg-ink/[0.03] px-4 py-3">
            <p className="text-sm">
              <span className="font-semibold text-ink">
                Linked to check-in {linkedCheckin.ticketCode}
              </span>
              <span className="text-fog"> · {linkedServiceLabel}</span>
            </p>
            <p className="mt-0.5 text-xs text-fog">
              Recording a transaction will attach it to this check-in.
            </p>
          </div>
        ) : null}

        {/* Saved records: search a stored customer/vehicle so the parish and the
            vehicle details don't have to be re-keyed. Search-driven (no preload),
            so it scales to a full records table. */}
        <ConsolePanel>
          <h2 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            Pull from saved records
          </h2>
          <p className="mt-1 text-sm text-fog">
            Optional. Search a customer (sets their parish) or a vehicle.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <RecordPicker<CustomerSummary>
              label="Customer"
              placeholder="Search by name, phone, or email"
              selection={selectedCustomer}
              selectionLabel={(c) =>
                `${c.full_name}${c.parish ? ` · ${c.parish}` : ""}`
              }
              search={searchCustomersAction}
              onSelect={handlePickCustomer}
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
              onSelect={(v) => setSelectedVehicle(v)}
              getKey={(v) => v.id}
              renderItem={(v) => (
                <>
                  <span className="font-semibold text-ink">
                    {vehicleLabel(v)}
                  </span>
                  <span className="ml-2 font-mono text-xs text-fog">
                    {v.vin}
                  </span>
                </>
              )}
            />
          </div>

          {recordNote ? (
            <p className="mt-3 rounded-lg border border-plate/30 bg-plate/5 px-3 py-2 text-sm font-medium text-plate">
              {recordNote}
            </p>
          ) : null}

          {selectedVehicle ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-line bg-mist/50 p-3 text-sm sm:grid-cols-4">
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

          {selectedCustomer && selectedVehicle ? (
            <a
              href={`/staff/forms?customer=${encodeURIComponent(
                selectedCustomer.id,
              )}&vehicle=${encodeURIComponent(selectedVehicle.id)}`}
              className="mt-3 inline-block text-sm font-semibold text-ink underline-offset-2 hover:text-plate hover:underline"
            >
              Generate DPSMV forms for this customer &amp; vehicle &rarr;
            </a>
          ) : null}
        </ConsolePanel>

        {/* Domicile */}
        <ConsolePanel>
          <h2 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            Buyer&rsquo;s parish (domicile)
          </h2>
          <p className="mt-1 text-sm text-fog">
            Tax is based on the buyer&rsquo;s parish of residence, not 88
            Title&rsquo;s location. Pick where the buyer lives.
          </p>

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
          <h2 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            Vehicle figures
          </h2>
          <p className="mt-1 text-sm text-fog">
            Taxable amount is the selling price less any qualifying trade-in and
            rebate.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MoneyField
              id="selling-price"
              label="Selling price"
              value={sellingPrice}
              onChange={setSellingPrice}
            />
            <MoneyField
              id="trade-in"
              label="Trade-in value"
              hint="Less trade"
              value={tradeIn}
              onChange={setTradeIn}
            />
            <MoneyField
              id="rebate"
              label="Rebate"
              hint="Less rebate"
              value={rebate}
              onChange={setRebate}
            />
          </div>
        </ConsolePanel>

        {/* Service fees */}
        <ConsolePanel>
          <h2 className="font-display text-lg font-extrabold text-ink sm:text-xl">
            88 Title service fees
          </h2>
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
      <aside className="lg:sticky lg:top-8">
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
                  <span>Total tax ({formatPercent(breakdown.combinedRatePercent)})</span>
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
            <h2 className="flex items-center gap-1.5 font-display text-base font-extrabold text-ink">
              Record transaction
              <HelpLink
                anchor="recording-a-transaction"
                label="recording a transaction"
              />
            </h2>
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

/** One vehicle detail in the selected-vehicle summary (DPSMV form fields). A
 *  VIN is 17 unbroken chars, so it takes a full-width row (`wide`) and renders
 *  monospace, so it never clips into the next cell and reads character by
 *  character at the counter. */
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
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {hint ? <span className="block text-xs text-fog">{hint}</span> : null}
      <span className="field mt-1 flex items-center rounded-xl border border-line bg-white focus-within:border-ink">
        <span className="pl-3 text-fog">$</span>
        <input
          id={id}
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
