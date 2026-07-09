/**
 * DPSMV form field maps - the EXACT AcroForm field names in the three real OMV
 * PDFs in /public, transcribed from each template's form dictionary (never
 * invented). The mapping layer (lib/forms/mapping.ts) references only these
 * constants, so the literal field-name strings - including the form's own quirks
 * (e.g. the "herby" typo, "State/Zip" with a slash) - live in one place.
 *
 * Determined by inspecting the templates:
 *   - public/14249283.pdf  Vehicle Application (2 pages, 125 widgets)
 *   - public/18538728.pdf  Bill of Sale of a Movable (rev 04/06/2026)
 *   - public/18544277.pdf  Act of Donation of a Movable (DPSMV1699)
 *   - public/forms/dpsmv-1806-...pdf  Permission to Process Transaction
 *       (the SAME fillable file the public /forms library links; it is a real
 *        AcroForm with 23 text fields, so we fill it rather than duplicate it)
 *
 * Signature, witness, and notary widgets are intentionally NOT listed here: they
 * are signed in person and always left blank. Fields with no confident data
 * source are also omitted and surfaced to staff as "verify" items, never guessed.
 */

/** A DPSMV template we can generate. */
export type DpsmvFormKind =
  | "vehicle-application"
  | "bill-of-sale"
  | "act-of-donation"
  | "permission-1806";

/** Metadata for one generatable template. */
export interface FormTemplate {
  kind: DpsmvFormKind;
  /** Path under /public (the real OMV template). May include a subdirectory. */
  file: string;
  /** Human label for menus and filenames. */
  label: string;
  /** Short description for the console. */
  blurb: string;
  /**
   * Short, clean slug for the download filename. Optional: when absent the file's
   * basename is used (so the existing forms keep their numeric-id filenames). Set
   * it for templates whose file basename is long or lives in a subdirectory.
   */
  slug?: string;
}

export const FORM_TEMPLATES: Record<DpsmvFormKind, FormTemplate> = {
  "vehicle-application": {
    kind: "vehicle-application",
    file: "14249283.pdf",
    label: "Vehicle Application",
    blurb:
      "OMV vehicle application (title / registration). Owner, vehicle, trade, tax value and tax.",
  },
  "bill-of-sale": {
    kind: "bill-of-sale",
    file: "18538728.pdf",
    label: "Bill of Sale of a Movable",
    blurb: "Records a sale: seller, buyer, vehicle, sale price and date.",
  },
  "act-of-donation": {
    kind: "act-of-donation",
    file: "18544277.pdf",
    label: "Act of Donation (DPSMV1699)",
    blurb: "Records a gift: donor, donee, vehicle, relationship and value.",
  },
  "permission-1806": {
    kind: "permission-1806",
    file: "forms/dpsmv-1806-permission-to-process-transaction.pdf",
    slug: "dpsmv-1806",
    label: "Permission to Process (1806)",
    blurb:
      "DPSMV 1806. Owner and vehicle pre-filled; the authorized person and transaction type are completed by hand.",
  },
};

/**
 * Bill of Sale of a Movable - 18538728.pdf.
 *
 * NOTE on the model year: this template ships a SINGLE field named "Year" wired
 * to two blanks at once - the vehicle-description "Year:" line AND the
 * execution-date "signed on this __ day of ______, year of ____" line. Setting
 * "Year" would stamp the model year onto the signing date too (a false date on a
 * notarized document). So fill.ts's pdf layer splits that shared field at load
 * time: the vehicle-description blank becomes its own field named "Vehicle Year"
 * (mapped below to the model year) and the execution-date blank keeps the "Year"
 * name and is left blank (signed in person). `vehicleYear` therefore only exists
 * on the loaded/split document, never on the template file on disk.
 */
export const BILL_OF_SALE = {
  parish: "Parish of",
  seller:
    "Seller of legal age who herby sells and delivers with full and general warranty of title unto",
  buyer: "Buyer of legal age the following movable property",
  make: "Make",
  model: "Model",
  /** Synthetic field created by the Year split (see NOTE): the model year. */
  vehicleYear: "Vehicle Year",
  vin: "Vehicle Identification Number VIN",
  salePrice: "Vehicle Sale Price",
  dateOfSale: "Date of Sale",
  // Execution date ("Signed on this __ day of __, year of __") - left blank,
  // signed in person. `year` is the execution-year widget kept after the split.
  execDay: "Day",
  execMonth: "Month",
  year: "Year",
} as const;

/** Act of Donation of a Movable (DPSMV1699) - 18544277.pdf. */
export const ACT_OF_DONATION = {
  parish: "Parish of",
  donor: "Donor",
  donee: "Donee",
  make: "Make",
  model: "Model",
  year: "Vehicle Year",
  vin: "VIN",
  relationship: "The relationship between Donor and Donee is as follows",
  value: "The value of the movable property donated herein is",
  // Execution date + notary - left blank, signed and notarized in person.
  execDay: "Day",
  execMonth: "Month",
  execYear: "Year",
  notaryName: "Notary Printed Name",
  notaryId: "Notary ID",
} as const;

/**
 * Vehicle Application - 14249283.pdf (page 1 is where all mapped data lives).
 *
 * NOTE on Make: unlike the single-widget "Year"/"Model"/"VIN" fields, the "Make"
 * field is wired to TWO widgets - the page-1 vehicle row AND a page-2 situational
 * plate-transfer affidavit that is deliberately left blank. Setting "Make" would
 * bleed the make onto that unused page-2 affidavit, so we do NOT list Make here;
 * the make is written by hand on the vehicle line instead. (It could be split
 * like the Bill of Sale "Year" if page-1 Make should auto-fill; left as-is per
 * the current design that keeps the whole of page 2 untouched.)
 */
export const VEHICLE_APPLICATION = {
  // Vehicle
  vin: "VIN",
  body: "Body",
  color: "Color",
  year: "Year",
  model: "Model",
  typeOfPlate: "Type of Plate",
  datePrepared: "Date Prepared",
  // Owner
  ownerName: "Name of Owner",
  ownerDl: "DL",
  ownerAddress: "Owner Principal Address",
  city: "City",
  parish: "Parish",
  stateZip: "State/Zip",
  // Trade-in
  tradeVin: "Trade VIN",
  // Condition (New / Used) checkboxes
  checkNew: "Check Box50",
  checkUsed: "Check Box51",
  // Acquisition / cost row
  dateAcquired: "Date Acquired",
  costOfVehicle: "Cost of Vehicle",
  lessTrade: "Less Trade",
  rebate: "Rebate",
  taxValue: "Tax Value",
  tax: "Tax",
  // First lienholder block (only when a lien is supplied)
  lienholder1: "1st Lienholder",
  lienholder1Street: "Street",
  lienholder1CityStateZip: "CityStateZip",
} as const;

/**
 * Permission to Process Transaction - DPSMV 1806
 * (public/forms/dpsmv-1806-permission-to-process-transaction.pdf).
 *
 * IMPORTANT - the field names look backwards. This template's AcroForm fields
 * were auto-detected and named after the text that FOLLOWS each blank (confirmed
 * by decoding the page content stream). So on the line
 *
 *     "I ____[owner]____ do hereby give permission for ____[permittee]____"
 *
 * the OWNER's printed-name blank is named "do hereby give permission for" (the
 * phrase that follows it) and the PERMITTEE blank is named "Print". We fill only
 * the owner, the vehicle, and the owner's DL; the permittee and the
 * transaction-type option boxes are left blank BY DESIGN (a human authorizes a
 * specific person for a specific action - not a data merge).
 */
export const PERMISSION_1806 = {
  /** The "I, ____" owner printed-name blank (named after the text after it). */
  ownerPrintName: "do hereby give permission for",
  year: "YEAR",
  make: "MAKE",
  model: "MODEL",
  vin: "VIN NUMBER",
  ownerDl: "Owners Drivers License Number",
  // Left blank by design (never filled here):
  //   "Print"                    - the person given permission (human decision)
  //   the transaction-type lines - checked by hand for this transaction
  //   "Owners Signature", "Date" - signed and dated in person
} as const;
