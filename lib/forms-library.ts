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
 * official name and the exact query a searcher types ("DPSMV 1806"). Only the
 * one-line `description` is translated, in lib/i18n/content/forms.ts.
 *
 * Publishing gate: ONLY entries with `public: true` are ever rendered on the
 * public page or linked to customers. Internal forms added here later (staff
 * references, situational forms) must be `public: false` so they never leak onto
 * the public page automatically — read the library through `publicForms` /
 * `getPublicForm`, never the raw list.
 *
 * COPY BOUNDARY: descriptions state what each form IS, taken from the form
 * itself. No "when you need this" / requirements / eligibility guidance lives
 * here — that is OMV guidance we are not qualified to author.
 * TODO(attorney-review): richer, plain-language explainer copy for each form
 * (what it is for, in the customer's words) is pending Chris's / attorney review.
 * Until then descriptions stay minimal and factual and no FAQ/explainer schema is
 * emitted for these forms.
 */

/** Stable slug for a library entry: the URL anchor on /forms and the link key. */
export type FormSlug = "dpsmv-1606" | "dpsmv-1806" | "dpsmv-1966";

export interface FormLibraryEntry {
  /** Stable id: the `#dpsmv-1606` anchor on /forms and the checklist link key. */
  slug: FormSlug;
  /** Official form number, English. Real heading text and the search query. */
  number: string;
  /** Official English title of the form (kept English: the document's name). */
  title: string;
  /** Path to the blank PDF under /public. Public files live under /forms. */
  file: string;
  /**
   * Factual one-liner: what the form IS, drawn from the form's own text. English
   * base; translated per locale in lib/i18n/content/forms.ts.
   */
  description: string;
  /** Only public entries render on /forms or link to customers. */
  public: boolean;
}

/**
 * The catalog. Descriptions are transcribed from each form's own language, never
 * invented (DPSMV 1606: "Federal and State law require that you state the mileage
 * upon transfer of ownership"; DPSMV 1806: "do hereby give permission for ___ to
 * process my transaction... This form IS NOT a power of attorney"; DPSMV 1966:
 * certifies an applicant "qualifies for a mobility impaired license plate and/or
 * hangtag").
 */
export const FORMS_LIBRARY: readonly FormLibraryEntry[] = [
  {
    slug: "dpsmv-1806",
    number: "DPSMV 1806",
    title: "Permission to Process Transaction",
    file: "/forms/dpsmv-1806-permission-to-process-transaction.pdf",
    description:
      "A signed permission for a named person to process a specific transaction with the Office of Motor Vehicles. It is not a power of attorney.",
    public: true,
  },
  {
    slug: "dpsmv-1966",
    number: "DPSMV 1966",
    title: "Medical Examiner's Certification of Mobility Impairment",
    file: "/forms/dpsmv-1966-mobility-impairment-certification.pdf",
    description:
      "A medical examiner's certification of an applicant's mobility impairment for a mobility-impaired license plate or hangtag.",
    public: true,
  },
  {
    slug: "dpsmv-1606",
    number: "DPSMV 1606",
    title: "Odometer Disclosure Statement",
    file: "/forms/dpsmv-1606-odometer-disclosure.pdf",
    description:
      "The state and federal odometer disclosure recording a vehicle's mileage at the transfer of ownership.",
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
