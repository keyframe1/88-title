#!/usr/bin/env node
// @ts-check
/**
 * Form-generation regression net (no test runner in this project, so a dev-only
 * script per the existing scripts/*.mjs convention). It exercises the REAL
 * generation path - lib/forms/mapping.ts to build each field map, then the pure
 * lib/forms/pdf.ts fillPdf() (including the Bill of Sale "Year" split) to fill the
 * actual OMV templates in /public - and reads the values back out of the produced
 * PDF with pdf-lib to prove the known-critical fields land.
 *
 * It guards the two fixed bugs specifically:
 *   1. Bill of Sale vehicle Year populates (and never stamps the signing date).
 *   2. Unset money fields render BLANK (never "$0.00"/"0.00") and unset date
 *      fields render BLANK (never today), while entered figures/dates land.
 *
 * Run:  node scripts/forms-selftest.mjs
 * (Node 22.18+/24 strips the TypeScript; scripts/ts-node-hook.mjs only teaches it
 *  to resolve the source's extensionless relative imports - no new dependencies.)
 */
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Register the resolve hook BEFORE importing any TypeScript source.
register("./ts-node-hook.mjs", import.meta.url);

const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");

const { PDFDocument } = await import("pdf-lib");
const { FORM_TEMPLATES } = await import("../lib/forms/fields.ts");
const {
  buildBillOfSale,
  buildActOfDonation,
  buildVehicleApplication,
  buildPermission1806,
} = await import("../lib/forms/mapping.ts");
const { fillPdf } = await import("../lib/forms/pdf.ts");

// --- fixtures --------------------------------------------------------------

/** Anthony, a full customer record with a driver's license (gated DL path). */
const CUSTOMER = {
  id: "cust-anthony",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  full_name: "Anthony Kulick",
  name_key: "anthony kulick",
  phone: "504-555-0123",
  email: "anthony@example.com",
  address_line1: "123 Main Street",
  address_line2: "Apt 4B",
  city: "Metairie",
  state: "LA",
  postal_code: "70002",
  parish: "Jefferson",
  id_type: "drivers_license",
  id_number: "001234567",
  id_state: "LA",
  id_last4: "4567",
  date_of_birth: "1985-03-14",
  notes: null,
};

/** A 2003 Honda Accord with body + color, VIN normalized. */
const VEHICLE = {
  id: "veh-accord",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  vin: "1HGCM82633A004352",
  year: 2003,
  make: "Honda",
  model: "Accord",
  body_style: "Sedan",
  color: "Silver",
  notes: null,
};

const TODAY = "2026-07-08";

/** A full set of figures (selling 12,500 - trade 2,000 - rebate 500 = 10,000). */
const FEES_FULL = {
  sellingCents: 1250000,
  tradeInCents: 200000,
  rebateCents: 50000,
  taxableCents: 1000000,
  taxCents: 97500,
  today: TODAY,
};

/** No figures entered: everything the fee engine produces is zero. */
const FEES_EMPTY = {
  sellingCents: 0,
  tradeInCents: 0,
  rebateCents: 0,
  taxableCents: 0,
  taxCents: 0,
  today: TODAY,
};

/** Base request with the transaction date entered. */
const REQ_WITH_DATE = {
  forms: ["bill-of-sale", "vehicle-application", "permission-1806"],
  customerId: CUSTOMER.id,
  vehicleId: VEHICLE.id,
  gift: false,
  counterpartyName: "Jane Seller",
  relationship: "",
  executionParish: "Jefferson",
  amount: "12500",
  tradeIn: "2000",
  rebate: "500",
  tradeVin: "",
  date: "2026-07-01",
  lienholderName: "",
  lienholderAddress: "",
  lienholderCityStateZip: "",
};

/** Same request but with NO date entered (must stay blank on the forms). */
const REQ_NO_DATE = { ...REQ_WITH_DATE, date: "" };

/** A gift request, for the Act of Donation. */
const REQ_GIFT = {
  ...REQ_WITH_DATE,
  forms: ["act-of-donation"],
  gift: true,
  counterpartyName: "Mary Donor",
  relationship: "Parent to child",
};

// --- harness ---------------------------------------------------------------

let failures = 0;
/** @type {string[]} */
const log = [];

/** Assert a readback field equals an expected string (blank = ""). */
function eq(form, name, expected, readback) {
  const actual = readback.get(name) ?? "";
  const ok = actual === expected;
  if (!ok) failures += 1;
  log.push(
    `  ${ok ? "PASS" : "FAIL"}  ${form}  ${JSON.stringify(name)} = ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`,
  );
}

/** Assert a field is blank in the produced PDF. */
function blank(form, name, readback) {
  eq(form, name, "", readback);
}

/** Read every text field's value out of a produced PDF. */
async function readback(bytes) {
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const field of form.getFields()) {
    const getText = /** @type {{ getText?: () => string | undefined }} */ (field)
      .getText;
    if (typeof getText === "function") {
      map.set(field.getName(), getText.call(field) ?? "");
    }
  }
  return map;
}

/** Generate one form: build the field map, fill the real template, read it back. */
async function generate(kind, map) {
  const templateBytes = await readFile(
    path.join(ROOT, "public", FORM_TEMPLATES[kind].file),
  );
  const bytes = await fillPdf(templateBytes, map);
  return readback(bytes);
}

/** No currency field on any produced form may read as a zero-dollar assertion. */
function assertNoZeroMoney(form, readback) {
  for (const [name, value] of readback) {
    if (value === "$0.00" || value === "0.00") {
      failures += 1;
      log.push(
        `  FAIL  ${form}  ${JSON.stringify(name)} printed a zero amount ${JSON.stringify(value)} (must be blank)`,
      );
    }
  }
}

// --- scenario 1: full figures + entered date -------------------------------

{
  const bos = await generate(
    "bill-of-sale",
    buildBillOfSale(REQ_WITH_DATE, CUSTOMER, VEHICLE, FEES_FULL),
  );
  const F = "BoS/full";
  eq(F, "Vehicle Year", "2003", bos); // Bug 1: model year lands
  eq(F, "Make", "Honda", bos);
  eq(F, "Model", "Accord", bos);
  eq(F, "Vehicle Identification Number VIN", VEHICLE.vin, bos);
  eq(F, "Buyer of legal age the following movable property", "Anthony Kulick", bos);
  eq(
    F,
    "Seller of legal age who herby sells and delivers with full and general warranty of title unto",
    "Jane Seller",
    bos,
  );
  eq(F, "Parish of", "Jefferson", bos);
  eq(F, "Vehicle Sale Price", "$12,500.00", bos);
  eq(F, "Date of Sale", "07/01/2026", bos);
  blank(F, "Year", bos); // exec-date year stays blank (never the model year)
  blank(F, "Day", bos);
  blank(F, "Month", bos);
  assertNoZeroMoney(F, bos);
}

{
  const va = await generate(
    "vehicle-application",
    buildVehicleApplication(REQ_WITH_DATE, CUSTOMER, VEHICLE, FEES_FULL),
  );
  const F = "VehApp/full";
  eq(F, "Year", "2003", va);
  eq(F, "Model", "Accord", va);
  eq(F, "VIN", VEHICLE.vin, va);
  eq(F, "Body", "Sedan", va);
  eq(F, "Color", "Silver", va);
  eq(F, "Name of Owner", "Anthony Kulick", va);
  eq(F, "DL", "001234567", va); // gated DL path (id_type = drivers_license)
  eq(F, "Owner Principal Address", "123 Main Street, Apt 4B", va);
  eq(F, "City", "Metairie", va);
  eq(F, "Parish", "Jefferson", va);
  eq(F, "State/Zip", "LA 70002", va);
  eq(F, "Date Prepared", "07/08/2026", va); // the date-generated exception
  eq(F, "Date Acquired", "07/01/2026", va);
  eq(F, "Cost of Vehicle", "12,500.00", va);
  eq(F, "Less Trade", "2,000.00", va);
  eq(F, "Rebate", "500.00", va);
  eq(F, "Tax Value", "10,000.00", va);
  eq(F, "Tax", "975.00", va);
  blank(F, "Make", va); // deliberate: shared page-2 widget, handwritten
  blank(F, "Domicile Code", va);
  assertNoZeroMoney(F, va);
}

{
  const p = await generate(
    "permission-1806",
    buildPermission1806(CUSTOMER, VEHICLE),
  );
  const F = "1806/full";
  eq(F, "do hereby give permission for", "Anthony Kulick", p); // owner name
  eq(F, "YEAR", "2003", p);
  eq(F, "MAKE", "Honda", p);
  eq(F, "MODEL", "Accord", p);
  eq(F, "VIN NUMBER", VEHICLE.vin, p);
  eq(F, "Owners Drivers License Number", "001234567", p);
  blank(F, "Print", p); // permittee: blank by design
  blank(F, "Owners Signature", p);
  blank(F, "Date", p);
}

{
  const aod = await generate(
    "act-of-donation",
    buildActOfDonation(REQ_GIFT, CUSTOMER, VEHICLE, FEES_FULL),
  );
  const F = "AoD/full";
  eq(F, "Vehicle Year", "2003", aod);
  eq(F, "Make", "Honda", aod);
  eq(F, "Model", "Accord", aod);
  eq(F, "VIN", VEHICLE.vin, aod);
  eq(F, "Donee", "Anthony Kulick", aod);
  eq(F, "Donor", "Mary Donor", aod);
  eq(F, "The relationship between Donor and Donee is as follows", "Parent to child", aod);
  eq(F, "The value of the movable property donated herein is", "$12,500.00", aod);
  blank(F, "Year", aod); // exec-date year blank
  assertNoZeroMoney(F, aod);
}

// --- scenario 2: NO figures + NO date (Bug 2: everything blank, year stays) --

{
  const bos = await generate(
    "bill-of-sale",
    buildBillOfSale(REQ_NO_DATE, CUSTOMER, VEHICLE, FEES_EMPTY),
  );
  const F = "BoS/empty";
  eq(F, "Vehicle Year", "2003", bos); // year still lands with no figures
  eq(F, "Make", "Honda", bos);
  eq(F, "Model", "Accord", bos);
  blank(F, "Vehicle Sale Price", bos); // Bug 2: BLANK, not "$0.00"
  blank(F, "Date of Sale", bos); // BLANK, not today
  assertNoZeroMoney(F, bos);
}

{
  const va = await generate(
    "vehicle-application",
    buildVehicleApplication(REQ_NO_DATE, CUSTOMER, VEHICLE, FEES_EMPTY),
  );
  const F = "VehApp/empty";
  eq(F, "Year", "2003", va); // vehicle facts still land
  eq(F, "Model", "Accord", va);
  eq(F, "VIN", VEHICLE.vin, va);
  eq(F, "Date Prepared", "07/08/2026", va); // still today (the exception)
  blank(F, "Cost of Vehicle", va);
  blank(F, "Less Trade", va);
  blank(F, "Rebate", va);
  blank(F, "Tax Value", va);
  blank(F, "Tax", va);
  blank(F, "Date Acquired", va); // BLANK, not today
  assertNoZeroMoney(F, va);
}

{
  const aod = await generate(
    "act-of-donation",
    buildActOfDonation({ ...REQ_GIFT, date: "" }, CUSTOMER, VEHICLE, FEES_EMPTY),
  );
  const F = "AoD/empty";
  eq(F, "Vehicle Year", "2003", aod);
  blank(F, "The value of the movable property donated herein is", aod); // BLANK, not "$0.00"
  assertNoZeroMoney(F, aod);
}

// --- report ----------------------------------------------------------------

console.log(log.join("\n"));
if (failures > 0) {
  console.error(`\n✗ forms self-test: ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log("\n✓ forms self-test: all assertions passed.\n");
