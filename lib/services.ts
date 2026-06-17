/**
 * 88 Title service menu line items.
 *
 * ⚠️ PLACEHOLDER PRICING. The convenience-charge amounts below were sampled from
 * a nearby notary as a reference point and are NOT final. Every 88 Title service
 * is marked `unconfirmed: true` and must be confirmed by Chris before launch.
 * These render with a visible "sample pricing, confirm in office" caveat.
 *
 * The $23 Public Tag Fee is the deliberate exception: it is a STATUTORY fee,
 * fixed by law, so it is `locked: true` and shown as exactly $23, never a
 * placeholder, never merged into another amount, and always accompanied by the
 * OMV disclosure. (Marking it "unconfirmed" would wrongly imply the statutory
 * fee is a sample, which would undercut the compliance requirement.)
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
  /** Placeholder price pending confirmation (shows a "sample" caveat). */
  unconfirmed?: boolean;
}

/**
 * The exact disclosure that must accompany the public tag fee wherever it is
 * shown. Single source of truth, reused by the pricing page, footer, etc.
 */
export const OMV_DISCLOSURE =
  "You may obtain your license plate (tag) directly from the Louisiana Office of Motor Vehicles without paying 88 Title’s convenience charge.";

/** Short caveat shown next to every placeholder (unconfirmed) price. */
export const SAMPLE_PRICE_NOTE = "sample pricing, confirm in office";

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
