"use client";

import { useMemo, useState } from "react";
import {
  OMV_DISCLOSURE,
  PUBLIC_TAG_FEE,
  serviceFees,
} from "@/lib/services";
import {
  calculateFees,
  formatCents,
  formatPercent,
} from "@/lib/tax/rates";
import type { RateBook, ResolvedRate } from "@/lib/tax/types";
import { vehicleLabel } from "@/lib/records/normalize";
import type { CustomerSummary, VehicleSummary } from "@/lib/records/types";

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
 * Saved records (lib/records/) feed the top of the form: picking a stored
 * customer sets the buyer parish from their domicile, and picking a stored
 * vehicle surfaces its details (for the DPSMV form). Both lists are optional and
 * empty until records exist; the tax math is unchanged either way.
 */
export function FeeTaxCalculator({
  rateBook,
  customers = [],
  vehicles = [],
}: {
  rateBook: RateBook;
  customers?: CustomerSummary[];
  vehicles?: VehicleSummary[];
}) {
  const defaultParish =
    rateBook.parishes.find((parish) => parish.name === "Jefferson") ??
    rateBook.parishes[0] ??
    null;

  const [parishName, setParishName] = useState<string>(
    defaultParish?.name ?? "",
  );
  const [districtNames, setDistrictNames] = useState<Set<string>>(
    () => new Set(),
  );
  const [sellingPrice, setSellingPrice] = useState("");
  const [tradeIn, setTradeIn] = useState("");
  const [rebate, setRebate] = useState("");
  const [feeIds, setFeeIds] = useState<Set<string>>(() => new Set());
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [recordNote, setRecordNote] = useState<string | null>(null);

  const parish = rateBook.parishes.find((p) => p.name === parishName) ?? null;
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;

  function selectParish(name: string) {
    setParishName(name);
    setDistrictNames(new Set()); // districts belong to a parish; reset on change
  }

  // Picking a stored customer sets the buyer parish from their domicile. If we
  // have no rate for that parish yet, say so and leave the parish menu for a
  // manual pick - we never invent a rate.
  function selectCustomer(id: string) {
    setCustomerId(id);
    setRecordNote(null);
    const customer = customers.find((c) => c.id === id);
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

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
      {/* ---- Left: inputs ------------------------------------------------- */}
      <div className="space-y-8">
        {/* Saved records: pull a stored customer/vehicle so the parish and the
            vehicle details don't have to be re-keyed. Only shown when records
            exist. */}
        {customers.length > 0 || vehicles.length > 0 ? (
          <section className="rounded-2xl border border-line bg-mist/40 p-5">
            <h2 className="font-display text-lg font-extrabold text-ink">
              Pull from saved records
            </h2>
            <p className="mt-1 text-sm text-fog">
              Optional. Reuse a customer (sets their parish) or a vehicle.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {customers.length > 0 ? (
                <label className="block">
                  <span className="block text-sm font-semibold text-ink">
                    Customer
                  </span>
                  <select
                    value={customerId}
                    onChange={(event) => selectCustomer(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-semibold text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="">None</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                        {c.parish ? ` · ${c.parish}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {vehicles.length > 0 ? (
                <label className="block">
                  <span className="block text-sm font-semibold text-ink">
                    Vehicle
                  </span>
                  <select
                    value={vehicleId}
                    onChange={(event) => setVehicleId(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-semibold text-ink focus:border-ink focus:outline-none"
                  >
                    <option value="">None</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {vehicleLabel(v)} · {v.vin}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {recordNote ? (
              <p className="mt-3 rounded-lg border border-plate/30 bg-plate/5 px-3 py-2 text-sm font-medium text-plate">
                {recordNote}
              </p>
            ) : null}

            {selectedVehicle ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-line bg-white p-3 text-sm sm:grid-cols-4">
                <VehicleFact label="VIN" value={selectedVehicle.vin} mono />
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

            {customerId && vehicleId ? (
              <a
                href={`/staff/forms?customer=${encodeURIComponent(
                  customerId,
                )}&vehicle=${encodeURIComponent(vehicleId)}`}
                className="mt-3 inline-block text-sm font-semibold text-ink underline-offset-2 hover:text-plate hover:underline"
              >
                Generate DPSMV forms for this customer &amp; vehicle &rarr;
              </a>
            ) : null}
          </section>
        ) : null}

        {/* Domicile */}
        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">
            Buyer&rsquo;s parish (domicile)
          </h2>
          <p className="mt-1 text-sm text-fog">
            Tax is based on the buyer&rsquo;s parish of residence, not 88
            Title&rsquo;s location. Pick where the buyer lives.
          </p>

          {rateBook.parishes.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-line bg-mist/60 px-3 py-2 text-sm font-medium text-fog">
              No parishes are configured yet. Add parish rows to tax_rates in the
              Supabase dashboard.
            </p>
          ) : (
            <label className="mt-3 block">
              <span className="sr-only">Buyer&rsquo;s parish</span>
              <select
                value={parishName}
                onChange={(event) => selectParish(event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 font-semibold text-ink focus:border-ink focus:outline-none"
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
        </section>

        {/* Vehicle figures */}
        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">
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
        </section>

        {/* Service fees */}
        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">
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
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{fee.label}</span>
                      {fee.unconfirmed ? (
                        <span className="inline-flex items-center rounded-full border border-plate/30 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-plate">
                          Sample price
                        </span>
                      ) : null}
                    </span>
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
        </section>
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

        <p className="mt-3 text-xs leading-relaxed text-fog">
          Internal estimate for staff. No penalty or interest is applied. Rates
          as of {rateBook.asOf}.
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

/** One vehicle detail in the selected-vehicle summary (DPSMV form fields). */
function VehicleFact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-fog">
        {label}
      </dt>
      <dd className={`text-ink ${mono ? "font-mono" : ""}`}>
        {value && value.trim() ? value : <span className="text-fog">n/a</span>}
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
      <span className="mt-1 flex items-center rounded-xl border border-line bg-white focus-within:border-ink">
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
