/**
 * 88 Title service menu line items.
 *
 * These amounts are reference prices drawn from a real competitor transaction
 * form, to be finalized with Chris, and are all shown plainly. The optional
 * `unconfirmed` flag remains available to mark a line as a not-yet-final
 * placeholder, but no service line currently uses it (the Convenience / Expedite
 * fee was finalized at a firm $25).
 *
 * The $23 Public Tag Fee is the deliberate exception to everything else: it is a
 * STATUTORY fee, fixed by law, so it lives in its own export (`PUBLIC_TAG_FEE`),
 * is `locked: true`, and is shown as exactly $23 — never a placeholder, never
 * merged into another amount, and always accompanied by the OMV disclosure.
 *
 * This module is the data behind a DISPLAY. It exports NO total-calculating
 * function: the site never computes a personalized total or estimates state
 * tax. The pricing-page calculator sums the *88 Title service fees the customer
 * selects* — a plain sum of known menu amounts, nothing more. It never adds in
 * the statutory $23, never adds state fees or tax, and never presents a final
 * total.
 */

export interface ServiceLineItem {
  /** Stable identifier (also used as a React key). */
  id: string;
  /** Human-readable line label. */
  label: string;
  /** Whole-dollar amount (USD). */
  amount: number;
  /** Short, plain explanation of what the fee covers. */
  description?: string;
  /**
   * Statutory / non-negotiable line that must always render as its own discrete
   * row, shown exactly as priced and never merged into another amount.
   */
  locked?: boolean;
  /** Collected on behalf of the state, not 88 Title revenue. */
  passThrough?: boolean;
  /** Disclosure or clarifying note shown alongside the line. */
  note?: string;
  /** Internal flag: amount is a placeholder pending confirmation, not yet final. */
  unconfirmed?: boolean;
}

/**
 * The exact disclosure that must accompany the public tag fee wherever it is
 * shown. Single source of truth, reused by the pricing page, footer, etc.
 */
export const OMV_DISCLOSURE =
  "You may obtain your license plate (tag) directly from the Louisiana Office of Motor Vehicles without paying 88 Title’s convenience charge.";

/**
 * The statutory $23 public tag fee. Kept apart from the selectable service fees
 * on purpose: it is always included, it is locked, and it is never summed into
 * 88 Title's service-fee subtotal.
 */
export const PUBLIC_TAG_FEE: ServiceLineItem = {
  id: "public-tag-fee",
  label: "Public Tag Fee",
  amount: 23,
  description: "The state’s license-plate (tag) fee, set by law.",
  locked: true,
  passThrough: true,
  note: OMV_DISCLOSURE,
  // Statutory and fixed, intentionally NOT marked `unconfirmed`.
};

/**
 * 88 Title's own service fees — the things a customer can choose. These are the
 * only lines the calculator adds together.
 */
export const serviceFees: ServiceLineItem[] = [
  {
    id: "notary",
    label: "Notary",
    amount: 50,
    description: "Notarizing your title, bill of sale, or transfer documents.",
  },
  {
    id: "title-service",
    label: "Title Service",
    amount: 25,
    description: "Preparing and processing your title transfer or application.",
  },
  {
    id: "lien-holder-service",
    label: "Lien Holder Service",
    amount: 15,
    description: "Recording or releasing a lien on the title.",
  },
  {
    id: "handling-registration",
    label: "Handling / Registration",
    amount: 8,
    description: "Handling your registration paperwork with the OMV.",
  },
  {
    id: "plate-disposal",
    label: "Plate Disposal",
    amount: 15,
    description: "Properly turning in a plate you no longer need.",
  },
  {
    id: "convenience-expedite",
    label: "Convenience / Expedite",
    amount: 25,
    description: "Faster, priority handling of your transaction.",
    note: "Convenience fee authorized under La. R.S. 47:532.1.",
  },
];

/**
 * Which 88 Title service fees TYPICALLY apply to each customer transaction.
 *
 * This is a DISPLAY AID, not a calculator: it maps a transaction slug (from
 * lib/checklists.ts) to the `serviceFees` ids that most often apply, so the
 * /pricing guide can PRE-CHECK a sensible starting point when a customer picks
 * what they came in for. It never sums anything and never implies a total.
 *
 * Pre-selection is a starting point, not a lock — every fee stays individually
 * toggleable in the UI. Situational add-ons are deliberately left OUT of every
 * preset so the customer opts into them only when they apply:
 *   - `lien-holder-service` — only when a loan/lien is involved,
 *   - `plate-disposal`      — only when a plate is being surrendered,
 *   - `convenience-expedite`— only when the customer wants priority handling.
 *
 * The statutory $23 public tag fee is intentionally NOT part of this map: it is
 * always shown, on its own locked line, and never merged or summed here.
 *
 * Mapping (reviewed — adjust here as Chris confirms real-world norms):
 *   title-transfer       → title-service, notary, handling-registration
 *   new-to-louisiana     → title-service, handling-registration
 *   duplicate-title      → title-service, notary
 *   inherited-vehicle    → title-service, notary, handling-registration
 *   registration-renewal → handling-registration
 *   plates               → handling-registration
 *   notary               → notary
 */
export const TRANSACTION_FEE_PRESETS: Record<string, readonly string[]> = {
  "title-transfer": ["title-service", "notary", "handling-registration"],
  "new-to-louisiana": ["title-service", "handling-registration"],
  "duplicate-title": ["title-service", "notary"],
  "inherited-vehicle": ["title-service", "notary", "handling-registration"],
  "registration-renewal": ["handling-registration"],
  plates: ["handling-registration"],
  notary: ["notary"],
};
