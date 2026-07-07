import "server-only";

/**
 * Server-only orchestration for DPSMV form generation. The single trusted path:
 *   1. load the saved customer + vehicle (RLS-gated DAL),
 *   2. resolve the domicile-based tax from the staff tax_rates book,
 *   3. map records + fees onto each requested form's real fields (pure),
 *   4. fill the real templates and merge for "print all".
 *
 * Identity and is_staff() are enforced by the caller (the route handler) and by
 * RLS in the database; this module assumes an authenticated staff context.
 */
import { getCustomerById, getVehicleById } from "@/lib/records/dal";
import { getTaxRates } from "@/lib/tax/dal";
import { buildRateBook, calculateFees } from "@/lib/tax/rates";
import type { ResolvedRate } from "@/lib/tax/types";
import { FORM_TEMPLATES, type DpsmvFormKind } from "./fields";
import { fillForm, mergePdfs } from "./fill";
import { buildFormMaps, type FormComputed } from "./mapping";
import type { FormFieldMap, FormGenRequest } from "./types";

export interface GeneratedForms {
  /** The merged (or single) filled PDF. */
  bytes: Uint8Array;
  /** A safe download filename, e.g. "88title-forms-smith.pdf". */
  filename: string;
  /** Per-form field maps (used to surface the "left blank to verify" list). */
  maps: FormFieldMap[];
}

export type GenerateResult =
  | { ok: true; data: GeneratedForms }
  | { ok: false; error: string };

/** Parse a dollar string ("12,500.00", "$12,500") to integer cents, clamped >= 0. */
function parseDollarsToCents(raw: string): number {
  const value = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

/** Resolve the domicile tax rates for a buyer's parish from the current book. */
async function resolveAppliedRates(
  parish: string | null,
): Promise<ResolvedRate[]> {
  const rows = await getTaxRates();
  const asOf = new Date().toISOString().slice(0, 10);
  const book = buildRateBook(rows, asOf);
  const rates: ResolvedRate[] = [];
  if (book.state) rates.push(book.state);
  if (parish) {
    const match = book.parishes.find(
      (p) => p.name.toLowerCase() === parish.toLowerCase(),
    );
    if (match) {
      rates.push({
        level: "parish",
        name: match.name,
        ratePercent: match.ratePercent,
        note: match.note,
      });
    }
  }
  return rates;
}

/**
 * A short, filesystem-safe token identifying a template in the download name.
 * Prefers the template's explicit `slug`; otherwise the file's basename without
 * its extension (so a template stored in a subdirectory never leaks a "/" into
 * the filename, and the existing numeric-id templates keep their names).
 */
function templateSlug(kind: DpsmvFormKind): string {
  const t = FORM_TEMPLATES[kind];
  return t.slug ?? t.file.replace(/^.*[\\/]/, "").replace(/\.pdf$/, "");
}

/** A filesystem-safe slug from a customer name, for the download filename. */
function nameSlug(fullName: string): string {
  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "customer";
}

export async function generateForms(
  req: FormGenRequest,
): Promise<GenerateResult> {
  if (req.forms.length === 0) {
    return { ok: false, error: "Choose at least one form to generate." };
  }

  const [customer, vehicle] = await Promise.all([
    getCustomerById(req.customerId),
    getVehicleById(req.vehicleId),
  ]);
  if (!customer) return { ok: false, error: "That customer record was not found." };
  if (!vehicle) return { ok: false, error: "That vehicle record was not found." };

  const sellingCents = parseDollarsToCents(req.amount);
  const tradeInCents = parseDollarsToCents(req.tradeIn);
  const rebateCents = parseDollarsToCents(req.rebate);

  // Domicile-based tax. If the tax book can't be read (table not applied yet),
  // still produce the forms with the tax value (selling - trade - rebate) and a
  // zero tax line, rather than failing the whole generation.
  let appliedRates: ResolvedRate[] = [];
  try {
    appliedRates = await resolveAppliedRates(customer.parish);
  } catch {
    appliedRates = [];
  }

  const breakdown = calculateFees({
    sellingPriceCents: sellingCents,
    tradeInCents,
    rebateCents,
    appliedRates,
    serviceFees: [],
  });

  const computed: FormComputed = {
    sellingCents: breakdown.sellingPriceCents,
    tradeInCents: breakdown.tradeInCents,
    rebateCents: breakdown.rebateCents,
    taxableCents: breakdown.taxableCents,
    taxCents: breakdown.totalTaxCents,
    today: new Date().toISOString().slice(0, 10),
  };

  const maps = buildFormMaps(req, customer, vehicle, computed);
  const filled = await Promise.all(maps.map((map) => fillForm(map)));
  const bytes = await mergePdfs(filled);

  const filename =
    maps.length === 1
      ? `88title-${templateSlug(maps[0].kind)}-${nameSlug(customer.full_name)}.pdf`
      : `88title-forms-${nameSlug(customer.full_name)}.pdf`;

  return { ok: true, data: { bytes, filename, maps } };
}
