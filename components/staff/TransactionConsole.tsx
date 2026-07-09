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
 * ONE customer/vehicle selection at the top drives ONE set of figures (selling
 * price, trade-in, rebate, trade-in VIN, date), entered exactly once. Those
 * figures feed BOTH the domicile tax math AND the printed OMV forms, so there is
 * no second figures block to keep in sync. A single sticky SUMMARY RAIL on the
 * right serves the whole page in workflow order: the total-collected breakdown
 * (with the "prints on the application" tax folded in as one line), Record
 * transaction, then the document generator.
 *
 * The workflow is still two steps (price -> documents): Step 1 gathers the buyer
 * parish, the shared figures, and the 88 Title fees on one flat surface; Step 2
 * holds only the genuinely document-only inputs (the gift toggle, the seller /
 * donor, and the parish the act is signed in). Everything stays staff-gated
 * server-side (is_staff() + RLS). The statutory $23 public tag fee keeps its own
 * discrete, never-merged line with the OMV disclosure.
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
  // detail (Start transaction) seeds the pickers. Everything below reads this pair.
  const seedCustomer = linkedCheckin?.customer ?? initialCustomer ?? null;
  const seedVehicle = linkedCheckin?.vehicle ?? initialVehicle ?? null;

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummary | null>(seedCustomer);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummary | null>(
    seedVehicle,
  );

  // ---- ONE set of figures: drives the tax math AND the printed forms --------
  const [sellingPrice, setSellingPrice] = useState("");
  const [tradeIn, setTradeIn] = useState("");
  const [rebate, setRebate] = useState("");
  const [tradeVin, setTradeVin] = useState("");
  const [date, setDate] = useState(today);

  // ---- Fees & tax (Step 1) --------------------------------------------------
  const defaultParish =
    rateBook.parishes.find((parish) => parish.name === "Jefferson") ??
    rateBook.parishes[0] ??
    null;
  // Seed the buyer parish from the customer's domicile (falling back to the
  // default) so the first render already reflects the pre-selected record.
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
  const [feeIds, setFeeIds] = useState<Set<string>>(() => new Set());
  const [parishNote, setParishNote] = useState<string | null>(null);

  // ---- Record transaction (rail) --------------------------------------------
  const [serviceType, setServiceType] = useState<string>(
    linkedCheckin?.serviceType ?? "",
  );
  const [txnNote, setTxnNote] = useState("");
  const [recording, startRecord] = useTransition();
  const [recordResult, setRecordResult] =
    useState<RecordTransactionResult | null>(null);

  // ---- Documents (Step 2 inputs + rail generator) ---------------------------
  const [gift, setGift] = useState(false);
  const [counterpartyName, setCounterpartyName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [executionParish, setExecutionParish] = useState(
    seedCustomer?.parish ?? "",
  );
  const [showLien, setShowLien] = useState(false);
  const [lienName, setLienName] = useState("");
  const [lienAddress, setLienAddress] = useState("");
  const [lienCityStateZip, setLienCityStateZip] = useState("");
  const [wantApplication, setWantApplication] = useState(true);
  const [wantTransfer, setWantTransfer] = useState(true);
  const [want1806, setWant1806] = useState(false);
  const [mode, setMode] = useState<"open" | "download">("open");
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // When the shared customer CHANGES, re-derive the parish-driven state from the
  // new record: the buyer parish + its note (from the domicile) and the "Parish
  // of" the act is signed in. This is the sanctioned "adjust state when a prop /
  // shared value changes" pattern (setState guarded during render, not an effect),
  // so it applies before paint with no extra commit. A genuine change re-derives;
  // the initial mount is already seeded above, so the guard skips it. We never
  // invent a rate: an unknown parish leaves the menu for a manual pick, and a
  // customer that carries no parish never clobbers a clerk's manual entry.
  const [syncedCustomerId, setSyncedCustomerId] = useState<string | null>(
    selectedCustomer?.id ?? null,
  );
  if ((selectedCustomer?.id ?? null) !== syncedCustomerId) {
    setSyncedCustomerId(selectedCustomer?.id ?? null);
    const c = selectedCustomer;
    if (!c) {
      setParishNote(null);
    } else {
      if (c.parish) setExecutionParish(c.parish);
      if (!c.parish) {
        setParishNote(
          `${c.full_name} has no parish on file. Pick the buyer parish below.`,
        );
      } else {
        const match = rateBook.parishes.find(
          (p) => p.name.toLowerCase() === c.parish?.toLowerCase(),
        );
        if (match) {
          setParishName(match.name);
          setDistrictNames(new Set()); // districts belong to a parish; reset
          setParishNote(null);
        } else {
          setParishNote(
            `No tax rate configured for ${c.parish} Parish. Add it to tax_rates, or pick a parish below.`,
          );
        }
      }
    }
  }

  const parish = rateBook.parishes.find((p) => p.name === parishName) ?? null;

  function selectParish(name: string) {
    setParishName(name);
    setDistrictNames(new Set()); // districts belong to a parish; reset on change
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

  // The single fee & tax computation for the whole page. Its taxable base and
  // tax come from the ONE set of figures above; the record snapshot and the
  // printed-tax line both read from this, so there is no second tax to drift.
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

  // The tax that prints on the OMV application is the domicile state + parish tax
  // (what the server fills onto the form). Any special-district tax is collected
  // at the counter but is not part of the printed figure, so it is split out.
  const printedTaxLines = breakdown.taxLines.filter(
    (line) => line.level === "state" || line.level === "parish",
  );
  const districtLines = breakdown.taxLines.filter(
    (line) => line.level === "district",
  );
  const printedTaxCents = printedTaxLines.reduce(
    (sum, line) => sum + line.amountCents,
    0,
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

  async function generate(forms: DpsmvFormKind[]) {
    setGenError(null);
    if (!selectedCustomer || !selectedVehicle) {
      setGenError("Pick a customer and a vehicle above first.");
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
          customerId: selectedCustomer.id,
          vehicleId: selectedVehicle.id,
          gift,
          counterpartyName,
          relationship,
          executionParish,
          // The ONE set of figures above; the forms carry exactly what the tax
          // math used, so a generated Bill of Sale price matches the tax value.
          amount: sellingPrice,
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
        setGenError(message);
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
      setGenError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const linkedServiceLabel = linkedCheckin
    ? (transactionPaths.find((p) => p.slug === linkedCheckin.serviceType)
        ?.label ?? linkedCheckin.serviceType)
    : "";

  const transferLabel = gift ? "Act of Donation" : "Bill of Sale";
  const partyLabel = gift ? "Donor (the giver)" : "Seller";
  const amountLabel = gift ? "Donation value" : "Selling price";
  const ready = Boolean(selectedCustomer && selectedVehicle);
  const saleCents = parseMoneyCents(sellingPrice);

  // The exact set the single "Generate selected" button produces, in a stable
  // print order (application, transfer, 1806). A "bill-of-sale" request is
  // resolved to an Act of Donation server-side when the gift toggle is set.
  const selectedForms: DpsmvFormKind[] = [];
  if (wantApplication) selectedForms.push("vehicle-application");
  if (wantTransfer) selectedForms.push("bill-of-sale");
  if (want1806) selectedForms.push("permission-1806");
  const nothingSelected = selectedForms.length === 0;

  // Informed blank (not blocking): a Bill of Sale with no price prints its price
  // line blank. Flag it so the clerk isn't surprised; generation still proceeds.
  const willPrintBlankPrice = wantTransfer && !gift && saleCents === 0;

  // Step 2's read-only echo of the shared figures, so the clerk can confirm what
  // the documents will carry without a second entry.
  const figuresSummary = `${saleCents > 0 ? formatCents(saleCents) : "No price"} ${
    gift ? "donation" : "sale"
  } · ${date ? formatIsoDateUs(date) : "no date"}`;

  return (
    <div className="mt-8 space-y-8">
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

      {/* ---- Shared selection: chosen once, drives both steps ------------- */}
      <ConsolePanel>
        <SectionHeading
          title="Customer & vehicle"
          description="Search a saved customer and vehicle once. The fee calculator and the documents both use this selection. Optional, but it sets the parish and fills the forms."
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

      {/* Two steps down the left, ONE sticky summary rail down the right. On a
          phone the grid collapses and the rail drops inline BETWEEN the steps
          (record + generate sit after the Step 1 figures, before Step 2). */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8">
        {/* ---- Step 1: fees & tax, on one flat surface ------------------- */}
        <section
          id="transaction-fees"
          className="scroll-mt-24 lg:col-start-1 lg:row-start-1"
        >
          <SectionHeading
            eyebrow="Step 1"
            title="Fees & tax"
            description="Domicile-based tax plus 88 Title service fees and the statutory tag fee. Enter the figures once; Step 2 prints them."
          />

          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
            {/* Buyer's parish (domicile) */}
            <FlatSection
              title="Buyer's parish (domicile)"
              description="Tax is based on the buyer's parish of residence, not 88 Title's location. Pick where the buyer lives."
            >
              {parishNote ? (
                <p className="mt-3 rounded-lg border border-plate/30 bg-plate/5 px-3 py-2 text-sm font-medium text-plate">
                  {parishNote}
                </p>
              ) : null}

              {rateBook.parishes.length === 0 ? (
                <p className="mt-3 rounded-lg border border-line bg-mist/60 px-3 py-2 text-sm font-medium text-fog">
                  No parishes are configured yet. Add parish rows to tax_rates in
                  the Supabase dashboard.
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
                  No state rate is configured. Add the state row to tax_rates so
                  the state portion is applied.
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
            </FlatSection>

            {/* Figures: entered ONCE, feed the tax above and the forms in Step 2. */}
            <FlatSection
              id="transaction-figures"
              title="Figures"
              description="Entered once. These set the tax and the amounts printed on the forms."
            >
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <MoneyField
                  label={amountLabel}
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
            </FlatSection>

            {/* 88 Title service fees (checkbox rows keep their row treatment) */}
            <FlatSection
              title="88 Title service fees"
              description="Add the services on this transaction. These are 88 Title charges, not taxed."
            >
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
                        <span className="font-semibold text-ink">
                          {fee.label}
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
            </FlatSection>
          </div>
        </section>

        {/* ---- The one summary rail (sticky, spans both steps) ----------- */}
        <aside className="mt-8 space-y-4 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:mt-0 lg:sticky lg:top-24">
          {/* Total collected + the itemized breakdown */}
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
                <Row
                  label="Less rebate"
                  value={breakdown.rebateCents}
                  negative
                />
                <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5 font-semibold text-ink">
                  <span>Taxable amount (tax value)</span>
                  <span>{formatCents(breakdown.taxableCents)}</span>
                </div>
              </div>

              {/* Tax: the state + parish tax that prints on the application is
                  the one readout; any district tax is collected but not printed,
                  so it is split below with its own collected total. */}
              <div className="space-y-1.5 border-t border-line pt-4">
                {breakdown.taxLines.length === 0 ? (
                  <p className="text-fog">No tax rates applied yet.</p>
                ) : (
                  <>
                    {printedTaxLines.map((line) => (
                      <Row
                        key={`${line.level}-${line.name}`}
                        label={`${taxLineLabel(line.level, line.name)} (${formatPercent(line.ratePercent)})`}
                        value={line.amountCents}
                      />
                    ))}
                    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5 font-semibold text-ink">
                      <span>Tax (prints on the application)</span>
                      <span>{formatCents(printedTaxCents)}</span>
                    </div>
                    {districtLines.length > 0 ? (
                      <>
                        {districtLines.map((line) => (
                          <Row
                            key={`${line.level}-${line.name}`}
                            label={`${taxLineLabel(line.level, line.name)} (${formatPercent(line.ratePercent)})`}
                            value={line.amountCents}
                          />
                        ))}
                        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5 font-semibold text-ink">
                          <span>
                            Total tax collected (
                            {formatPercent(breakdown.combinedRatePercent)})
                          </span>
                          <span>{formatCents(breakdown.totalTaxCents)}</span>
                        </div>
                        <p className="text-xs text-fog">
                          Special district tax is collected but does not print on
                          the application.
                        </p>
                      </>
                    ) : null}
                  </>
                )}
                {selectedCustomer && !selectedCustomer.parish ? (
                  <p className="text-xs text-plate">
                    No parish on file for {selectedCustomer.full_name}: the
                    application prints its parish and tax blank until you add one
                    in records.
                  </p>
                ) : null}
              </div>

              {/* Service fees */}
              {breakdown.serviceFeeLines.length > 0 ? (
                <div className="space-y-1.5 border-t border-line pt-4">
                  {breakdown.serviceFeeLines.map((fee) => (
                    <Row
                      key={fee.id}
                      label={fee.label}
                      value={fee.amountCents}
                    />
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

          {/* Record transaction: capture this state onto the day's ledger. It
              lives here, next to the fee math it freezes (Step 1's action). */}
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="border-b border-line bg-mist px-5 py-3">
              <h3 className="flex items-center gap-1.5 font-display text-base font-extrabold text-ink">
                Record transaction
                <HelpLink
                  anchor="recording-a-transaction"
                  label="recording a transaction"
                />
              </h3>
              <p className="mt-0.5 text-xs text-fog">
                Save this to the day&rsquo;s ledger. The figures are frozen
                exactly as shown.
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

          {/* Documents to generate: the Step 2 action, below the fee math. */}
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="space-y-4 p-5">
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
                {want1806 &&
                selectedCustomer &&
                selectedCustomer.id_type !== "drivers_license" ? (
                  <p className="mt-2 text-xs text-fog">
                    1806: the owner DL line stays blank ({selectedCustomer.full_name}
                    &rsquo;s ID on file is not a driver&rsquo;s license).
                  </p>
                ) : null}
                {/* Informed blank: a Bill of Sale with no price prints blank. */}
                {ready && willPrintBlankPrice ? (
                  <p className="mt-2 text-xs text-fog">
                    No sale price entered. The Bill of Sale price line will print
                    blank.
                  </p>
                ) : null}
              </fieldset>

              {/* Output format + the single generate action. */}
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
                {genError ? (
                  <p role="alert" className="mt-2 text-sm font-medium text-plate">
                    {genError}
                  </p>
                ) : null}
              </div>

              {hasGenerated ? (
                <div className="border-t border-line pt-3">
                  <p className="text-sm font-semibold text-ink">
                    Forms generated.
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-fog">
                    Record the transaction above to add it to the day&rsquo;s
                    ledger (the statutory $23 is included there).
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-fog">
            Internal estimate for staff. No penalty or interest is applied. Rates
            as of {RATES_VERIFIED}.
          </p>
        </aside>

        {/* ---- Step 2: document-only inputs ----------------------------- */}
        <section
          id="transaction-documents"
          className="mt-8 scroll-mt-24 lg:col-start-1 lg:row-start-2 lg:mt-0"
        >
          <SectionHeading
            eyebrow="Step 2"
            title="Documents"
            description="Just the document-only details. The customer, vehicle, and figures come from above; a gift swaps the Bill of Sale for an Act of Donation."
          />

          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
            {/* Transfer document: the only inputs unique to Step 2. */}
            <FlatSection title="Transfer document">
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
                  hint={
                    'The "Parish of" line. Prefilled from the buyer\'s parish.'
                  }
                  value={executionParish}
                  onChange={setExecutionParish}
                />
              </div>

              {/* Read-only echo of the shared figures, with a jump to edit them. */}
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg border border-line bg-mist/50 px-3 py-2.5 text-sm">
                <span className="text-fog">
                  Using figures from above:{" "}
                  <span className="font-semibold text-ink">
                    {figuresSummary}
                  </span>
                </span>
                <a
                  href="#transaction-figures"
                  className="font-semibold text-ink underline underline-offset-2 hover:text-plate"
                >
                  Edit figures
                </a>
              </div>

              {/* Optional lienholder, printed in the security-agreement block. */}
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
            </FlatSection>

            {/* What stays blank: the full explanation lives once in the Help
                reference (single source of truth); this is just the pointer. */}
            <div className="flex items-center justify-between gap-3 border-t border-line p-5 sm:p-6">
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ===========================================================================
// Shared pieces
// ===========================================================================

/**
 * One flat section inside a shared surface: a hairline top rule (collapsed on the
 * first section), consistent padding, and a standard header (title + optional
 * description). This is the Records flat treatment applied to the Transaction
 * workspace - sections on one surface, no nested cards. Children bring their own
 * top margin.
 */
function FlatSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`border-t border-line p-5 first:border-t-0 sm:p-6 ${
        id ? "scroll-mt-24" : ""
      }`}
    >
      <h3 className="font-display text-lg font-extrabold text-ink sm:text-xl">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm text-fog">{description}</p>
      ) : null}
      {children}
    </section>
  );
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

/** Format a YYYY-MM-DD date as MM/DD/YYYY (string-only, so no timezone shift). */
function formatIsoDateUs(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso.trim();
}

/** Pull a filename from a Content-Disposition header, or a sensible default. */
function parseFilename(header: string | null): string {
  const match = header ? /filename="?([^"]+)"?/.exec(header) : null;
  return match ? match[1] : "88title-forms.pdf";
}
