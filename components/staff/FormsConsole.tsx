"use client";

import { useMemo, useState } from "react";
import { calculateFees, formatCents } from "@/lib/tax/rates";
import type { RateBook, ResolvedRate } from "@/lib/tax/types";
import { vehicleLabel } from "@/lib/records/normalize";
import type { CustomerSummary, VehicleSummary } from "@/lib/records/types";
import type { DpsmvFormKind } from "@/lib/forms/fields";

/**
 * Staff-only DPSMV form generator (client).
 *
 * Pick a saved customer (the buyer / owner / donee) and vehicle, add the
 * counterparty and the transaction figures, and generate print-ready filled
 * PDFs of the real OMV forms. The gift toggle swaps the Bill of Sale for an Act
 * of Donation; the Vehicle Application generates either way. Filling itself is
 * server-side (/api/staff/forms, staff-gated); this is only the picker + the
 * read-only tax preview that mirrors what prints on the application.
 *
 * The statutory $23 public tag fee and 88 Title's service fees are NOT placed on
 * these forms - they stay on the fee calculator, the $23 as its own discrete,
 * unmerged line. Signatures and notary blocks are always left blank (in person).
 */
export function FormsConsole({
  customers,
  vehicles,
  rateBook,
  today,
  initialCustomerId,
  initialVehicleId,
}: {
  customers: CustomerSummary[];
  vehicles: VehicleSummary[];
  rateBook: RateBook | null;
  today: string;
  initialCustomerId: string;
  initialVehicleId: string;
}) {
  const [customerId, setCustomerId] = useState(
    customers.some((c) => c.id === initialCustomerId) ? initialCustomerId : "",
  );
  const [vehicleId, setVehicleId] = useState(
    vehicles.some((v) => v.id === initialVehicleId) ? initialVehicleId : "",
  );
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

  const customer = customers.find((c) => c.id === customerId) ?? null;
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null;

  const [executionParish, setExecutionParish] = useState(
    customer?.parish ?? "",
  );
  const [busy, setBusy] = useState<DpsmvFormKind[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectCustomer(id: string) {
    setCustomerId(id);
    const next = customers.find((c) => c.id === id);
    // Prefill the "Parish of" (where the act is signed) from the buyer's parish.
    if (next?.parish) setExecutionParish(next.parish);
  }

  // Read-only tax preview that matches what the server prints on the Vehicle
  // Application (Tax Value + Tax). Domicile-based: state + the buyer's parish.
  const preview = useMemo(() => {
    const appliedRates: ResolvedRate[] = [];
    if (rateBook?.state) appliedRates.push(rateBook.state);
    const parish = rateBook?.parishes.find(
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
      sellingPriceCents: toCents(amount),
      tradeInCents: toCents(tradeIn),
      rebateCents: toCents(rebate),
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
      setError("Pick a customer and a vehicle first.");
      return;
    }
    // Open a tab synchronously (inside the click) so it isn't popup-blocked; we
    // navigate it once the PDF is ready. Download mode skips this.
    const win = mode === "open" ? window.open("", "_blank") : null;
    setBusy(forms);
    try {
      const res = await fetch("/api/staff/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forms,
          customerId,
          vehicleId,
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
      setBusy(null);
    }
  }

  const transferLabel = gift ? "Act of Donation" : "Bill of Sale";
  const partyLabel = gift ? "Donor (the giver)" : "Seller";
  const amountLabel = gift ? "Donation value" : "Sale price";
  const ready = Boolean(customer && vehicle);

  if (customers.length === 0 && vehicles.length === 0) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-line bg-mist/60 p-6 text-sm font-medium text-fog">
        No saved customers or vehicles yet. Add them in{" "}
        <a className="font-semibold text-ink underline" href="/staff/records">
          Customer &amp; vehicle records
        </a>{" "}
        first, then come back to generate forms.
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="space-y-8">
        {/* Records */}
        <section className="rounded-2xl border border-line bg-mist/40 p-5">
          <h2 className="font-display text-lg font-extrabold text-ink">
            Customer &amp; vehicle
          </h2>
          <p className="mt-1 text-sm text-fog">
            The customer is treated as the buyer / owner / donee. Both are pulled
            from saved records.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="block text-sm font-semibold text-ink">
                Customer
              </span>
              <select
                value={customerId}
                onChange={(e) => selectCustomer(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-semibold text-ink focus:border-ink focus:outline-none"
              >
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                    {c.parish ? ` · ${c.parish}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-ink">
                Vehicle
              </span>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-semibold text-ink focus:border-ink focus:outline-none"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {vehicleLabel(v)} · {v.vin}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {vehicle ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-line bg-white p-3 text-sm sm:grid-cols-4">
              <Fact label="VIN" value={vehicle.vin} mono />
              <Fact label="Year" value={vehicle.year?.toString() ?? null} />
              <Fact label="Make" value={vehicle.make} />
              <Fact label="Model" value={vehicle.model} />
              <Fact label="Body" value={vehicle.body_style} />
              <Fact label="Color" value={vehicle.color} />
            </dl>
          ) : null}
          {customer && !customer.parish ? (
            <p className="mt-3 rounded-lg border border-plate/30 bg-plate/5 px-3 py-2 text-sm font-medium text-plate">
              {customer.full_name} has no parish on file, so the owner parish and
              the tax preview will be blank. Add a parish in records to price it.
            </p>
          ) : null}
        </section>

        {/* Transaction type */}
        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">
            Transfer document
          </h2>
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
            <Text
              label={partyLabel}
              value={counterpartyName}
              onChange={setCounterpartyName}
              placeholder="Full name"
            />
            {gift ? (
              <Text
                label="Relationship of donor to donee"
                value={relationship}
                onChange={setRelationship}
                placeholder="e.g. Parent to child"
              />
            ) : null}
            <Text
              label="Parish where signed"
              hint={'The "Parish of" line. Prefilled from the buyer\'s parish.'}
              value={executionParish}
              onChange={setExecutionParish}
            />
          </div>
        </section>

        {/* Figures */}
        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">
            Figures
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Money label={amountLabel} value={amount} onChange={setAmount} />
            <Money
              label="Trade-in value"
              value={tradeIn}
              onChange={setTradeIn}
            />
            <Money label="Rebate" value={rebate} onChange={setRebate} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Text
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
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:border-ink focus:outline-none"
              />
            </label>
          </div>
        </section>

        {/* Lienholder (optional) */}
        <section>
          <button
            type="button"
            onClick={() => setShowLien((v) => !v)}
            className="text-sm font-semibold text-ink underline-offset-2 hover:text-plate hover:underline"
          >
            {showLien ? "Hide lienholder" : "+ Add a lienholder (optional)"}
          </button>
          {showLien ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Text
                label="Lienholder name"
                value={lienName}
                onChange={setLienName}
              />
              <Text
                label="Lienholder street"
                value={lienAddress}
                onChange={setLienAddress}
              />
              <Text
                label="Lienholder city / state / ZIP"
                value={lienCityStateZip}
                onChange={setLienCityStateZip}
              />
            </div>
          ) : null}
        </section>

        {/* What stays blank */}
        <section className="rounded-2xl border border-dashed border-line bg-mist/40 p-5">
          <h2 className="font-display text-base font-extrabold text-ink">
            Left blank by design
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fog">
            <li>All signature, witness, and notary blocks (signed in person).</li>
            <li>
              <strong className="text-ink">Make</strong> on the Vehicle
              Application: the template has no fillable Make field, so handwrite
              it (it is on the Bill of Sale / Donation).
            </li>
            <li>
              The OMV fee grid (Title Fee, Handling Fee, License Fee, totals):
              the office computes those. Only Tax Value and Tax are filled.
            </li>
            <li>
              The statutory $23 public tag fee is not placed here. It stays its
              own discrete line on the{" "}
              <a className="font-semibold text-ink underline" href="/staff/fees">
                fee calculator
              </a>
              , never merged.
            </li>
          </ul>
        </section>
      </div>

      {/* Generate panel (sticky on desktop) */}
      <aside className="lg:sticky lg:top-8">
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
                No tax rate configured for {customer?.parish}. Add it in tax_rates
                to price the tax.
              </p>
            ) : null}
          </div>

          <div className="space-y-3 p-5">
            <fieldset>
              <legend className="sr-only">After generating</legend>
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
              disabled={!ready || busy !== null}
              onClick={() => generate(["vehicle-application"])}
              className="plate-btn plate-btn--red w-full text-sm disabled:opacity-60"
            >
              {isBusy(busy, ["vehicle-application"])
                ? "Generating…"
                : "Vehicle Application"}
            </button>
            <button
              type="button"
              disabled={!ready || busy !== null}
              onClick={() => generate(["bill-of-sale"])}
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink disabled:opacity-60"
            >
              {isBusy(busy, ["bill-of-sale"])
                ? "Generating…"
                : transferLabel}
            </button>
            <button
              type="button"
              disabled={!ready || busy !== null}
              onClick={() => generate(["vehicle-application", "bill-of-sale"])}
              className="w-full rounded-xl border border-ink bg-ink px-3 py-2.5 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isBusy(busy, ["vehicle-application", "bill-of-sale"])
                ? "Generating…"
                : `Print all (App + ${transferLabel})`}
            </button>

            {!ready ? (
              <p className="text-xs text-fog">
                Select a customer and a vehicle to generate.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm font-medium text-plate">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function isBusy(busy: DpsmvFormKind[] | null, forms: DpsmvFormKind[]): boolean {
  return (
    busy !== null &&
    busy.length === forms.length &&
    forms.every((f, i) => busy[i] === f)
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

function Fact({
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

function Text({
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
        className={`mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:border-ink focus:outline-none ${
          mono ? "font-mono uppercase" : ""
        }`}
      />
    </label>
  );
}

function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      <span className="mt-1 flex items-center rounded-xl border border-line bg-white focus-within:border-ink">
        <span className="pl-3 text-fog">$</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl bg-transparent px-2 py-2.5 text-ink focus:outline-none"
        />
      </span>
    </label>
  );
}

/** Parse a dollar input to integer cents; blank / invalid becomes 0. */
function toCents(raw: string): number {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

/** Pull a filename from a Content-Disposition header, or a sensible default. */
function parseFilename(header: string | null): string {
  const match = header ? /filename="?([^"]+)"?/.exec(header) : null;
  return match ? match[1] : "88title-forms.pdf";
}
