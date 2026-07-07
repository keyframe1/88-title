/**
 * Pure mapping: stored records + fee-engine figures -> the real AcroForm fields
 * of each DPSMV template. No Supabase, no pdf-lib, no I/O, so this is the single
 * testable place that decides what value lands in which named field and which
 * fields are deliberately left blank for staff to verify.
 *
 * Source of truth for the field-name strings: lib/forms/fields.ts (transcribed
 * from the real templates). Source of the data: getCustomerById / getVehicleById
 * (the records DAL) and calculateFees (lib/tax/rates.ts) - never re-keyed.
 *
 * Rules honored here:
 *   - Signature, witness, and notary fields are never filled (signed in person).
 *   - The statutory $23 public tag fee is NOT placed on the Vehicle Application:
 *     that form's fee grid is the OMV's own statutory computation, and the $23
 *     must stay its own discrete, unmerged line (it lives on the fee calculator).
 *   - When a field has no confident source it is left blank and listed in
 *     `blanks`, never guessed.
 */
import type { Customer, Vehicle } from "@/lib/records/types";
import {
  ACT_OF_DONATION,
  BILL_OF_SALE,
  PERMISSION_1806,
  VEHICLE_APPLICATION,
  type DpsmvFormKind,
} from "./fields";
import type { FormFieldMap, FormGenRequest } from "./types";

/** Fee figures the mapper prints, all integer cents, resolved server-side. */
export interface FormComputed {
  sellingCents: number;
  tradeInCents: number;
  rebateCents: number;
  /** max(0, selling - trade - rebate). The "Tax Value" on the application. */
  taxableCents: number;
  /** Total domicile-based tax. The single "Tax" box on the application. */
  taxCents: number;
  /** Date prepared (today), YYYY-MM-DD. */
  today: string;
}

/** Format integer cents as a plain grouped amount, e.g. 1250000 -> "12,500.00". */
function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.max(0, Math.round(cents)) / 100);
}

/** Same as money() but with a leading "$", for the prose sale/value lines. */
function dollars(cents: number): string {
  return `$${money(cents)}`;
}

/** Format a YYYY-MM-DD date as MM/DD/YYYY; passes through anything unexpected. */
function usDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso.trim();
}

/** Trim to a plain string, never null/undefined (blank when absent). */
function s(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** The owner's one-line residence address from the record (line1 + unit). */
function ownerAddress(customer: Customer): string {
  return [s(customer.address_line1), s(customer.address_line2)]
    .filter(Boolean)
    .join(", ");
}

/** "LA 70002" from a record's state + postal code. */
function stateZip(customer: Customer): string {
  return [s(customer.state), s(customer.postal_code)].filter(Boolean).join(" ");
}

/** Drop blank entries from a text map so we only set fields we actually have. */
function pruneText(text: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(text)) {
    if (v.trim().length > 0) out[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bill of Sale of a Movable (18538728.pdf)
// ---------------------------------------------------------------------------

export function buildBillOfSale(
  req: FormGenRequest,
  customer: Customer,
  vehicle: Vehicle,
  fees: FormComputed,
): FormFieldMap {
  const text = pruneText({
    [BILL_OF_SALE.parish]: s(req.executionParish),
    [BILL_OF_SALE.seller]: s(req.counterpartyName),
    [BILL_OF_SALE.buyer]: s(customer.full_name),
    [BILL_OF_SALE.make]: s(vehicle.make),
    [BILL_OF_SALE.model]: s(vehicle.model),
    [BILL_OF_SALE.vin]: s(vehicle.vin),
    [BILL_OF_SALE.salePrice]: dollars(fees.sellingCents),
    [BILL_OF_SALE.dateOfSale]: usDate(req.date || fees.today),
  });

  const blanks: string[] = [
    "Model year (the template's \"Year :\" line has no fillable field; handwrite it)",
    "Seller and Buyer signatures (signed in person)",
    "Notary public + execution date \"Signed on this __ day of __\" (notarized in person)",
  ];
  if (!text[BILL_OF_SALE.parish]) blanks.push("Parish of (no value supplied)");

  return { kind: "bill-of-sale", text, checks: [], blanks };
}

// ---------------------------------------------------------------------------
// Act of Donation of a Movable / DPSMV1699 (18544277.pdf)
// ---------------------------------------------------------------------------

export function buildActOfDonation(
  req: FormGenRequest,
  customer: Customer,
  vehicle: Vehicle,
  fees: FormComputed,
): FormFieldMap {
  // The saved customer is treated as the donee (new owner); the counterparty is
  // the donor (the giver).
  const text = pruneText({
    [ACT_OF_DONATION.parish]: s(req.executionParish),
    [ACT_OF_DONATION.donor]: s(req.counterpartyName),
    [ACT_OF_DONATION.donee]: s(customer.full_name),
    [ACT_OF_DONATION.make]: s(vehicle.make),
    [ACT_OF_DONATION.model]: s(vehicle.model),
    [ACT_OF_DONATION.year]: vehicle.year != null ? String(vehicle.year) : "",
    [ACT_OF_DONATION.vin]: s(vehicle.vin),
    [ACT_OF_DONATION.relationship]: s(req.relationship),
    [ACT_OF_DONATION.value]: dollars(fees.sellingCents),
  });

  const blanks: string[] = [
    "Witness, Donor and Donee signatures (signed in person)",
    "Notary signature / printed name / ID + execution date (notarized in person)",
  ];
  if (!text[ACT_OF_DONATION.relationship]) {
    blanks.push("Relationship between donor and donee (none entered)");
  }

  return { kind: "act-of-donation", text, checks: [], blanks };
}

// ---------------------------------------------------------------------------
// Vehicle Application (14249283.pdf) - the complex one
// ---------------------------------------------------------------------------

export function buildVehicleApplication(
  req: FormGenRequest,
  customer: Customer,
  vehicle: Vehicle,
  fees: FormComputed,
): FormFieldMap {
  const F = VEHICLE_APPLICATION;
  const isDl = customer.id_type === "drivers_license";

  const text = pruneText({
    // Vehicle
    [F.vin]: s(vehicle.vin),
    [F.body]: s(vehicle.body_style),
    [F.color]: s(vehicle.color),
    [F.year]: vehicle.year != null ? String(vehicle.year) : "",
    [F.model]: s(vehicle.model),
    [F.datePrepared]: usDate(fees.today),
    // Owner (the buyer / new owner)
    [F.ownerName]: s(customer.full_name),
    [F.ownerDl]: isDl ? s(customer.id_number) : "",
    [F.ownerAddress]: ownerAddress(customer),
    [F.city]: s(customer.city),
    [F.parish]: s(customer.parish),
    [F.stateZip]: stateZip(customer),
    // Trade-in
    [F.tradeVin]: s(req.tradeVin),
    // Acquisition + cost / tax (the parts the fee engine computes)
    [F.dateAcquired]: usDate(req.date || fees.today),
    [F.costOfVehicle]: money(fees.sellingCents),
    [F.lessTrade]: fees.tradeInCents > 0 ? money(fees.tradeInCents) : "",
    [F.rebate]: fees.rebateCents > 0 ? money(fees.rebateCents) : "",
    [F.taxValue]: money(fees.taxableCents),
    [F.tax]: money(fees.taxCents),
    // First lienholder (only when supplied)
    [F.lienholder1]: s(req.lienholderName),
    [F.lienholder1Street]: s(req.lienholderAddress),
    [F.lienholder1CityStateZip]: s(req.lienholderCityStateZip),
  });

  const blanks: string[] = [
    "Make (the template has no fillable Make widget; handwrite it - the make is on file)",
    "Type of Plate, License No, Exp Date, Mileage, ELT, Dealer Code (no source / office-entered)",
    "Owner driver's license number (only filled when the ID on file is a driver's license)",
    "Joint owner + their DL (no joint owner on file)",
    "Domicile Code (the OMV numeric parish code is not in our data)",
    "New / Used condition checkbox (not stored)",
    "Date Acquired and Tax Date (Date Acquired is set to the transaction date - confirm)",
    "Previous Title No. and State (no source)",
    "OMV fee grid: Title Fee, Handling Fee, Mortgage Fee, License Fee, Misc/Tow/Transfer fees, all credits/penalties/interest, Total Fees, Total Taxes, Grand Total (OMV-computed, not from the fee engine)",
    "Statutory $23 public tag fee is NOT placed here (stays its own discrete line on the fee calculator, never merged into the OMV fee grid)",
    "Mail-renewal / lessee / renter / duplicate-title checkboxes (situational)",
    "Owner signature + sworn date and the entire page 2 (plate transfer, lost-plate, farm-use, out-of-state and salvage disclosures - situational, signed in person)",
  ];
  if (!text[F.parish]) {
    blanks.push("Owner Parish (no parish/domicile on the customer record)");
  }

  return { kind: "vehicle-application", text, checks: [], blanks };
}

// ---------------------------------------------------------------------------
// Permission to Process Transaction / DPSMV 1806 (public/forms/dpsmv-1806...pdf)
// ---------------------------------------------------------------------------

/**
 * Map a saved owner + vehicle onto the fillable 1806. Only the owner's printed
 * name, the vehicle (year/make/model/VIN), and the owner's driver's license
 * number are merged. The DL is placed ONLY when the ID on file is a driver's
 * license, from the sensitive id_number that the RLS-gated getCustomerById
 * resolves server-side (same staff-gated path the Vehicle Application uses) - it
 * is never widened to the client and never logged.
 *
 * Deliberately BLANK (a human decision, not a data merge): the person given
 * permission, the transaction-type option boxes, and the owner's signature/date.
 * These are surfaced in `blanks` for the clerk to complete by hand.
 */
export function buildPermission1806(
  customer: Customer,
  vehicle: Vehicle,
): FormFieldMap {
  const F = PERMISSION_1806;
  const isDl = customer.id_type === "drivers_license";

  const text = pruneText({
    [F.ownerPrintName]: s(customer.full_name),
    [F.year]: vehicle.year != null ? String(vehicle.year) : "",
    [F.make]: s(vehicle.make),
    [F.model]: s(vehicle.model),
    [F.vin]: s(vehicle.vin),
    [F.ownerDl]: isDl ? s(customer.id_number) : "",
  });

  const blanks: string[] = [
    'Person given permission (the "give permission for" name): the 1806 authorizes a specific person, so it is completed by hand',
    "Transaction type (Renewal, Duplicate registration, Transfer of ownership, Surrender plate, IRP, driving-record items, Other): checked by hand for this transaction",
    "Owner signature and date (signed in person)",
  ];
  if (!isDl) {
    blanks.push(
      "Owner driver's license number (the ID on file is not a driver's license)",
    );
  }

  return { kind: "permission-1806", text, checks: [], blanks };
}

// ---------------------------------------------------------------------------
// Orchestration helper (still pure): which forms, honoring the gift toggle
// ---------------------------------------------------------------------------

/**
 * Build the field maps for the requested forms. The Bill of Sale and Act of
 * Donation are mutually exclusive - the gift toggle decides which one stands in
 * for the "transfer" form - while the Vehicle Application generates either way.
 */
export function buildFormMaps(
  req: FormGenRequest,
  customer: Customer,
  vehicle: Vehicle,
  fees: FormComputed,
): FormFieldMap[] {
  const maps: FormFieldMap[] = [];
  for (const kind of req.forms) {
    const resolved = resolveKind(kind, req.gift);
    if (resolved === "vehicle-application") {
      maps.push(buildVehicleApplication(req, customer, vehicle, fees));
    } else if (resolved === "act-of-donation") {
      maps.push(buildActOfDonation(req, customer, vehicle, fees));
    } else if (resolved === "permission-1806") {
      // The 1806 needs no transaction figures or fees: owner + vehicle + DL only.
      maps.push(buildPermission1806(customer, vehicle));
    } else {
      maps.push(buildBillOfSale(req, customer, vehicle, fees));
    }
  }
  return maps;
}

/** A "bill-of-sale" request becomes an "act-of-donation" when it is a gift. */
function resolveKind(kind: DpsmvFormKind, gift: boolean): DpsmvFormKind {
  if (kind === "bill-of-sale" || kind === "act-of-donation") {
    return gift ? "act-of-donation" : "bill-of-sale";
  }
  return kind;
}
