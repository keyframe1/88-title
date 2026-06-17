/**
 * 88 Title service menu line items.
 *
 * The convenience-charge amounts below are placeholders pending Chris's
 * confirmation, flagged `unconfirmed: true` for internal tracking. The pricing
 * page no longer stamps each line; instead it shows a single, plain note that
 * the final total, including any state fees, is confirmed at the counter.
 *
 * The $23 Public Tag Fee is the deliberate exception: it is a STATUTORY fee,
 * fixed by law, so it is `locked: true` and shown as exactly $23, never a
 * placeholder, never merged into another amount, and always accompanied by the
 * OMV disclosure.
 *
 * This module drives a DISPLAY (the pricing menu). By design it exports NO
 * total-calculating function: the site never computes a personalized total or
 * estimates state tax. Menu prices only.
 */

export interface ServiceLineItem {
  /** Stable identifier (also used as a React key). */
  id: string;
  /** Human-readable line label. */
  label: string;
  /** Whole-dollar amount (USD). Displayed, never summed by this app. */
  amount: number;
  /**
   * Statutory / non-negotiable line that must always render as its own discrete
   * row, shown exactly as priced and never merged into another amount.
   */
  locked?: boolean;
  /** Collected on behalf of the state, not 88 Title revenue. */
  passThrough?: boolean;
  /** Disclosure or clarifying note shown alongside the line. */
  note?: string;
  /** Internal flag: price is a placeholder pending confirmation, not yet final. */
  unconfirmed?: boolean;
}

/**
 * The exact disclosure that must accompany the public tag fee wherever it is
 * shown. Single source of truth, reused by the pricing page, footer, etc.
 */
export const OMV_DISCLOSURE =
  "You may obtain your license plate (tag) directly from the Louisiana Office of Motor Vehicles without paying 88 Title’s convenience charge.";

export const services: ServiceLineItem[] = [
  {
    id: "public-tag-fee",
    label: "Public Tag Fee",
    amount: 23,
    locked: true,
    passThrough: true,
    note: OMV_DISCLOSURE,
    // Statutory and fixed, intentionally NOT marked `unconfirmed`.
  },
  {
    id: "notary",
    label: "Notary",
    amount: 50,
    unconfirmed: true,
  },
  {
    id: "title-service",
    label: "Title Service",
    amount: 25,
    unconfirmed: true,
  },
  {
    id: "lien-holder-service",
    label: "Lien Holder Service",
    amount: 15,
    unconfirmed: true,
  },
  {
    id: "plate-disposal",
    label: "Plate Disposal",
    amount: 15,
    unconfirmed: true,
  },
];
