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
 *
 * Signature, witness, and notary widgets are intentionally NOT listed here: they
 * are signed in person and always left blank. Fields with no confident data
 * source are also omitted and surfaced to staff as "verify" items, never guessed.
 */

/** A DPSMV template we can generate. */
export type DpsmvFormKind =
  | "vehicle-application"
  | "bill-of-sale"
  | "act-of-donation";

/** Metadata for one generatable template. */
export interface FormTemplate {
  kind: DpsmvFormKind;
  /** Filename under /public (the real OMV template). */
  file: string;
  /** Human label for menus and filenames. */
  label: string;
  /** Short description for the console. */
  blurb: string;
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
};

/**
 * Bill of Sale of a Movable - 18538728.pdf.
 * NOTE: the "Year :" line on this template has NO fillable widget, so the model
 * year cannot be placed here; it is reported as a verify item instead.
 */
export const BILL_OF_SALE = {
  parish: "Parish of",
  seller:
    "Seller of legal age who herby sells and delivers with full and general warranty of title unto",
  buyer: "Buyer of legal age the following movable property",
  make: "Make",
  model: "Model",
  vin: "Vehicle Identification Number VIN",
  salePrice: "Vehicle Sale Price",
  dateOfSale: "Date of Sale",
  // Execution date ("Signed on this __ day of __") - left blank, signed in person.
  execDay: "Day",
  execMonth: "Month",
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

/** Vehicle Application - 14249283.pdf (page 1 is where all mapped data lives). */
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
