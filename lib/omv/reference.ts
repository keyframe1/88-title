/**
 * OMV reference display helpers.
 *
 * Joins the staff-only omv_reference rows (lib/omv/types.ts) to the transaction
 * catalog (lib/checklists.ts) so the staff console can render one card per
 * transaction in a stable order, with the slots inside each card ordered and a
 * clear "nothing configured yet" signal. Pure (no Supabase import); the DAL does
 * the privileged read and hands rows here.
 */
import { transactionPaths } from "@/lib/checklists";
import type { OmvReferenceRow } from "./types";

export interface OmvReferenceGroup {
  /** Transaction slug, e.g. "title-transfer". */
  slug: string;
  /** Transaction label from the catalog, e.g. "Title transfer". */
  label: string;
  /** One-line transaction description from the catalog. */
  blurb: string;
  /** This transaction's code slots, ordered by display_order then label. */
  entries: OmvReferenceRow[];
  /** How many of this transaction's slots have a code filled in. */
  configuredCount: number;
  /** True when NO slot in this transaction has a code yet (the launch state). */
  unconfigured: boolean;
}

/** A slot counts as configured only when it holds a non-blank code. */
export function isCodeSet(code: string | null): boolean {
  return code !== null && code.trim().length > 0;
}

/**
 * Group reference rows by transaction, in the catalog's order. Every transaction
 * appears even if it has no rows yet, so staff always see where codes will live.
 */
export function groupOmvReference(
  rows: readonly OmvReferenceRow[],
): OmvReferenceGroup[] {
  return transactionPaths.map((path) => {
    const entries = rows
      .filter((row) => row.transaction_slug === path.slug)
      .sort(
        (a, b) =>
          a.display_order - b.display_order || a.label.localeCompare(b.label),
      );
    const configuredCount = entries.filter((entry) => isCodeSet(entry.code))
      .length;
    return {
      slug: path.slug,
      label: path.label,
      blurb: path.blurb,
      entries,
      configuredCount,
      unconfigured: configuredCount === 0,
    };
  });
}
