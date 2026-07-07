/**
 * Staff counter-checklist helpers (pure; no Supabase import).
 *
 * The serving-card checklist lets a clerk tick off a check-in's "what to bring"
 * items (lib/checklists.ts) as they verify documents at the counter. This module
 * is the server-side trust boundary + the blank-form resolver:
 *
 *   - sanitizeCheckedIds() keeps only ids that really belong to the transaction's
 *     checklist, in the checklist's own order and de-duplicated, so a tampered
 *     request cannot store junk in checked_items (mirrors sanitizeReadyIds).
 *   - blankFormFor() resolves a checklist item's optional formSlug to the blank
 *     forms-library PDF (href + label), or null when the item maps to no form.
 */
import { getTransactionPath } from "@/lib/checklists";
import { FORM_TEMPLATES, type DpsmvFormKind } from "@/lib/forms/fields";

/**
 * Keep only the ids that actually belong to `serviceType`'s checklist, in the
 * checklist's own order and de-duplicated. The server-side guard for the
 * checked_items write: a hand-crafted request cannot smuggle arbitrary strings.
 */
export function sanitizeCheckedIds(
  serviceType: string,
  checked: readonly string[],
): string[] {
  const path = getTransactionPath(serviceType);
  if (!path) return [];
  const wanted = new Set(checked);
  return path.items
    .filter((item) => wanted.has(item.id))
    .map((item) => item.id);
}

/** A blank forms-library PDF a checklist item maps to (public asset href + label). */
export interface BlankFormLink {
  href: string;
  label: string;
}

/**
 * Resolve a checklist item's formSlug to its blank template in /public, or null.
 * The DPSMV templates are committed public assets (lib/forms/fields.ts), so the
 * href is just `/<file>`.
 */
export function blankFormFor(
  formSlug: DpsmvFormKind | undefined,
): BlankFormLink | null {
  if (!formSlug) return null;
  const template = FORM_TEMPLATES[formSlug];
  return { href: `/${template.file}`, label: template.label };
}
