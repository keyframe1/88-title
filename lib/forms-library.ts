/**
 * 88 Title public forms library.
 *
 * A plain catalog of the blank Louisiana OMV (DPSMV) forms a customer may be
 * asked to bring: the official form number, the official title, the blank PDF to
 * download, and a strictly factual one-line description drawn from the form's OWN
 * text. This is the single source of truth for the public /forms page and for the
 * "Download the form" links on the transaction checklists.
 *
 * Language: the form NUMBER and TITLE stay in English — they are the document's
 * official name and the exact query a searcher types ("DPSMV 1806"). The one-line
 * `description` and the `completedBy` role are translated in
 * lib/i18n/content/forms.ts. Each form also cross-links to the transaction
 * service(s) it belongs to (`services`), resolved to localized labels there.
 *
 * Ordering: the catalog is sequenced by how often customers reach for each form,
 * not by form number. The core Vehicle Application (DPSMV 1799) leads, then the
 * two private-party transfer instruments (Bill of Sale for a sale, Act of
 * Donation for a gift); the situational permission, odometer, and medical forms
 * follow.
 *
 * Publishing gate: ONLY entries with `public: true` are ever rendered on the
 * public page or linked to customers. Internal forms added here later (staff
 * references, situational forms) must be `public: false` so they never leak onto
 * the public page automatically — read the library through `publicForms` /
 * `getPublicForm`, never the raw list.
 *
 * COPY BOUNDARY: descriptions and the `completedBy` role state what each form IS
 * and who fills it, taken from the form itself. No "when you need this" /
 * requirements / eligibility guidance lives here — that is OMV guidance we are not
 * qualified to author.
 * TODO(attorney-review): richer, plain-language explainer copy for each form
 * (what it is for, in the customer's words) is pending Chris's / attorney review.
 * When it lands, each `slug` below is the intended route for a /forms/[slug]
 * explainer page (the same slug is already the #anchor on /forms), so titles can
 * link there without a data change. Until then descriptions stay minimal and
 * factual and no FAQ/explainer schema is emitted for these forms.
 */

/** Stable slug for a library entry: the URL anchor on /forms, the future
 *  /forms/[slug] explainer route, and the checklist link key. */
export type FormSlug =
  | "dpsmv-1799"
  | "bill-of-sale"
  | "act-of-donation"
  | "dpsmv-1806"
  | "dpsmv-1606"
  | "dpsmv-1966";

export interface FormLibraryEntry {
  /** Stable id: the `#dpsmv-1799` anchor on /forms and the checklist link key. */
  slug: FormSlug;
  /**
   * Official form number, English. Real heading text and the search query
   * ("DPSMV 1799"). Empty string for a document with no DPSMV number (a bill of
   * sale): the /forms eyebrow is then omitted rather than showing a blank slot or
   * an invented number.
   */
  number: string;
  /** Official English title of the form (kept English: the document's name). */
  title: string;
  /**
   * Path to the blank PDF under /public. Public files live under /forms so the
   * X-Robots-Tag noindex header in next.config applies. `null` when no vetted
   * blank is published yet: the row then renders a graceful "coming soon" state
   * (no broken link) instead of a download.
   */
  file: string | null;
  /**
   * Factual one-liner: what the form IS, drawn from the form's own text. English
   * base; translated per locale in lib/i18n/content/forms.ts.
   */
  description: string;
  /**
   * Factual role that completes the form ("Signed by the owner"). Role ONLY — no
   * requirements or when-to-use guidance. English base; translated per locale in
   * lib/i18n/content/forms.ts.
   */
  completedBy: string;
  /**
   * The transaction service(s) this form belongs to, as `transactionPaths` slugs
   * (lib/checklists.ts). Drives the quiet "Used for: Title transfer" cross-link
   * under the row. Map ONLY clear, factual relationships; at most TWO per form so
   * the line stays a pointer, not a list. `[]` for a genuinely cross-cutting form
   * (e.g. the permission form, used across every transaction) — the row then
   * shows no cross-link rather than an arbitrary one.
   */
  services: readonly string[];
  /** Only public entries render on /forms or link to customers. */
  public: boolean;
}

/**
 * The catalog, ordered by relevance (most-wanted first). Descriptions are
 * transcribed from each form's own language, never invented (DPSMV 1606:
 * "Federal and State law require that you state the mileage upon transfer of
 * ownership"; DPSMV 1806: "do hereby give permission for ___ to process my
 * transaction... This form IS NOT a power of attorney"; DPSMV 1966: certifies an
 * applicant "qualifies for a mobility impaired license plate and/or hangtag").
 */
export const FORMS_LIBRARY: readonly FormLibraryEntry[] = [
  {
    slug: "dpsmv-1799",
    number: "DPSMV 1799",
    title: "Vehicle Application",
    file: "/forms/dpsmv-1799-vehicle-application.pdf",
    description:
      "The Louisiana application to title and register a vehicle.",
    completedBy: "Completed by the applicant",
    // The core title/registration form for both a private-party transfer and a
    // vehicle brought in from out of state.
    services: ["title-transfer", "new-to-louisiana"],
    public: true,
  },
  {
    slug: "bill-of-sale",
    // A bill of sale has no DPSMV number; the /forms eyebrow is omitted for it.
    number: "",
    title: "Bill of Sale",
    // The blank "Bill of Sale of a Movable" AcroForm (same field structure the
    // staff generator fills): parish, seller, buyer, vehicle, sale price, date.
    file: "/forms/bill-of-sale.pdf",
    description:
      "Records the price, date, and both parties in a private-party sale.",
    completedBy: "Filled by buyer and seller",
    services: ["title-transfer"],
    public: true,
  },
  {
    slug: "act-of-donation",
    // Printed on the form as "DPSMV1699"; shown spaced for search parity with the
    // other DPSMV entries ("DPSMV 1699" is the query a searcher types).
    number: "DPSMV 1699",
    title: "Act of Donation of a Movable",
    // The blank "Act of Donation of a Movable" (DPSMV1699) AcroForm — the same
    // vetted file the staff generator fills, copied under /forms for the noindex
    // header (see next.config). Donor, donee, vehicle, relationship, value.
    file: "/forms/act-of-donation.pdf",
    description:
      "Records the gift of a vehicle from a donor to a donee, with their relationship and its stated value.",
    completedBy: "Filled by donor and donee",
    // A donation is a private-party transfer of ownership, like a bill of sale.
    services: ["title-transfer"],
    public: true,
  },
  {
    slug: "dpsmv-1806",
    number: "DPSMV 1806",
    title: "Permission to Process Transaction",
    file: "/forms/dpsmv-1806-permission-to-process-transaction.pdf",
    description:
      "A signed permission for a named person to process a specific transaction with the Office of Motor Vehicles. It is not a power of attorney.",
    completedBy: "Signed by the owner",
    // Cross-cutting: it can accompany any transaction, so no single service.
    services: [],
    public: true,
  },
  {
    slug: "dpsmv-1606",
    number: "DPSMV 1606",
    title: "Odometer Disclosure Statement",
    file: "/forms/dpsmv-1606-odometer-disclosure.pdf",
    description:
      "The state and federal odometer disclosure recording a vehicle's mileage at the transfer of ownership.",
    completedBy: "Filled by buyer and seller",
    // Part of the title-transfer checklist (the odometer item links this form).
    services: ["title-transfer"],
    public: true,
  },
  {
    slug: "dpsmv-1966",
    number: "DPSMV 1966",
    title: "Medical Examiner's Certification of Mobility Impairment",
    file: "/forms/dpsmv-1966-mobility-impairment-certification.pdf",
    description:
      "A medical examiner's certification of an applicant's mobility impairment for a mobility-impaired license plate or hangtag.",
    completedBy: "Completed by a physician",
    // The certification behind a mobility-impaired specialty plate or hangtag.
    services: ["plates"],
    public: true,
  },
];

/**
 * The publishable subset, in catalog order. Everything customer-facing (the
 * /forms page, the checklist download links) reads this, so a `public: false`
 * entry can never leak onto a public surface.
 */
export const publicForms: readonly FormLibraryEntry[] = FORMS_LIBRARY.filter(
  (form) => form.public,
);

/** One public form by slug, or undefined if unknown or not public. */
export function getPublicForm(slug: string): FormLibraryEntry | undefined {
  return publicForms.find((form) => form.slug === slug);
}
