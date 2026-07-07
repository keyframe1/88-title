/**
 * 88 Title transaction "what to bring" checklists.
 *
 * Single source of truth for the customer transaction types. Drives:
 *  - the DocumentFinder tool (interactive, checkable checklist),
 *  - the homepage services grid,
 *  - the /services index and /services/[slug] pages.
 *
 * These checklists are general guidance to help customers avoid a wasted trip,
 * not legal advice. Requirements can vary by situation; specifics are confirmed
 * in office.
 */
import type { DpsmvFormKind } from "@/lib/forms/fields";
import type { FormSlug } from "@/lib/forms-library";

export interface ChecklistItem {
  /** Stable id (used as a React key and as the checkbox state key). */
  id: string;
  /** What to bring. */
  label: string;
  /** Optional clarifying detail. */
  detail?: string;
  /**
   * Optional map to a blank forms-library template (lib/forms/fields.ts), set
   * ONLY for obvious, factual 1:1 mappings. When present, the staff serving-card
   * checklist links the blank PDF so a clerk can hand or print the form. Not
   * customer-facing.
   */
  formSlug?: DpsmvFormKind;
  /**
   * Optional map to a PUBLIC form in the forms library (lib/forms-library.ts),
   * set ONLY where the item clearly and factually corresponds to a real public
   * form. When present, the customer-facing checklist shows a "Download the form"
   * link to the blank PDF. Distinct from `formSlug` above (that is the staff-only
   * generated template); most items map to neither.
   */
  publicFormSlug?: FormSlug;
}

export interface TransactionPath {
  /** URL slug, e.g. "title-transfer". */
  slug: string;
  /** Short label, e.g. "Title transfer". */
  label: string;
  /** One-line description for cards and page intros. */
  blurb: string;
  /** Ordered "what to bring" items for this transaction. */
  items: ChecklistItem[];
}

export const transactionPaths: TransactionPath[] = [
  {
    slug: "title-transfer",
    label: "Title transfer",
    blurb: "Buying or selling a used vehicle between private parties.",
    items: [
      {
        id: "title-signed",
        label: "The vehicle title, signed over to you",
        detail: "The seller completes the assignment/transfer section on the back.",
      },
      {
        id: "bill-of-sale",
        label: "A bill of sale",
        detail: "Showing the price, date, and both parties. We can notarize it.",
        formSlug: "bill-of-sale",
      },
      {
        id: "photo-id",
        label: "Your photo ID",
        detail: "Louisiana driver’s license or state ID.",
      },
      {
        id: "insurance",
        label: "Proof of Louisiana insurance",
        detail: "Current liability coverage in your name.",
      },
      {
        id: "odometer",
        label: "Odometer disclosure",
        detail: "Required for most vehicles under 20 years old.",
        // The Odometer Disclosure Statement is exactly DPSMV 1606, so link the
        // blank form here. (A bill of sale has no single state form, so it gets
        // no link.)
        publicFormSlug: "dpsmv-1606",
      },
    ],
  },
  {
    slug: "new-to-louisiana",
    label: "New to Louisiana",
    blurb: "Registering a vehicle you’re bringing in from another state.",
    items: [
      {
        id: "oos-title",
        label: "Your out-of-state title",
        detail: "If financed, bring your lienholder’s name and account number.",
      },
      {
        id: "oos-registration",
        label: "Your current out-of-state registration",
      },
      {
        id: "photo-id",
        label: "Your photo ID",
      },
      {
        id: "insurance",
        label: "Proof of Louisiana insurance",
      },
      {
        id: "vin",
        label: "The vehicle, for a VIN check",
        detail: "Some transfers require a physical VIN/odometer verification.",
      },
    ],
  },
  {
    slug: "duplicate-title",
    label: "Duplicate title",
    blurb: "Replacing a lost, stolen, or damaged Louisiana title.",
    items: [
      {
        id: "photo-id",
        label: "Your photo ID",
      },
      {
        id: "vehicle-info",
        label: "Your vehicle details",
        detail: "VIN, plate number, or the previous title number.",
      },
      {
        id: "affidavit",
        label: "The reason for the replacement",
        detail: "We can notarize a lost/stolen affidavit on the spot.",
      },
      {
        id: "lien-release",
        label: "A lien release, if one applies",
        detail: "Bring it if a loan on the vehicle was paid off.",
      },
    ],
  },
  {
    slug: "inherited-vehicle",
    label: "Inherited vehicle",
    blurb: "Transferring a vehicle after the owner has passed away.",
    items: [
      {
        id: "title",
        label: "The vehicle title",
      },
      {
        id: "death-cert",
        label: "A certified death certificate",
      },
      {
        id: "succession",
        label: "Succession or heirship paperwork",
        detail:
          "A court judgment of possession, or an affidavit of heirship for qualifying estates.",
      },
      {
        id: "heir-id",
        label: "The heir’s photo ID",
      },
      {
        id: "insurance",
        label: "Proof of Louisiana insurance",
      },
    ],
  },
  {
    slug: "registration-renewal",
    label: "Registration renewal",
    blurb: "Renewing the registration on a vehicle you already own.",
    items: [
      {
        id: "renewal-notice",
        label: "Your renewal notice or current registration",
      },
      {
        id: "photo-id",
        label: "Your photo ID",
      },
      {
        id: "insurance",
        label: "Proof of current insurance",
      },
      {
        id: "plate-number",
        label: "Your license plate number",
      },
    ],
  },
  {
    slug: "plates",
    label: "Plates",
    blurb: "Transferring, replacing, or ordering specialty plates.",
    items: [
      {
        id: "photo-id",
        label: "Your photo ID",
      },
      {
        id: "registration",
        label: "Your current registration",
      },
      {
        id: "existing-plate",
        label: "Your existing plate",
        detail: "Needed for a plate transfer or replacement.",
      },
      {
        id: "insurance",
        label: "Proof of insurance",
      },
    ],
  },
  {
    slug: "notary",
    label: "Notary",
    blurb: "Notarizing acts, affidavits, and authorizations.",
    items: [
      {
        id: "documents",
        label: "The document(s) to be notarized",
        detail: "Leave the signature blank. Sign in front of the notary.",
      },
      {
        id: "signer-id",
        label: "Valid photo ID for every signer",
      },
      {
        id: "signers-present",
        label: "All signers, present in person",
      },
    ],
  },
];

/** Look up a transaction path by slug. */
export function getTransactionPath(slug: string): TransactionPath | undefined {
  return transactionPaths.find((path) => path.slug === slug);
}
