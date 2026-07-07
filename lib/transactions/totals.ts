/**
 * Pure day-totals for the reconciliation report (no Supabase, cents throughout).
 *
 * The report separates the three kinds of money that flow across the counter:
 *   (a) 88 Title service-fee revenue  - what the agency actually earns,
 *   (b) tax pass-through              - collected for the state / parish,
 *   (c) statutory $23 tag fee pass-through - collected for the state,
 * and (d) the grand total collected = a + b + c.
 *
 * VOIDED transactions are excluded from every total (a void reverses the
 * collection); they still appear on the report, struck through, with their reason.
 */
import type { Transaction } from "./types";

export interface DayTotals {
  /** Number of counted (non-voided) transactions. */
  count: number;
  /** Number of voided transactions in the set (shown, but excluded from money). */
  voidedCount: number;
  /** (a) 88 Title service-fee revenue. */
  serviceFeeRevenueCents: number;
  /** (b) tax collected for the state / parish. */
  taxCents: number;
  /** (c) statutory $23 tag-fee pass-through. */
  statutoryCents: number;
  /** (b + c) total pass-through collected on behalf of the state / parish. */
  passThroughCents: number;
  /** (d) grand total collected at the counter. */
  totalCollectedCents: number;
}

/** True when a transaction counts toward the day's money (i.e. not voided). */
function isCounted(t: Transaction): boolean {
  return t.status !== "voided";
}

/** Sum the day's transactions into the report's separated totals. */
export function computeDayTotals(rows: readonly Transaction[]): DayTotals {
  const totals: DayTotals = {
    count: 0,
    voidedCount: 0,
    serviceFeeRevenueCents: 0,
    taxCents: 0,
    statutoryCents: 0,
    passThroughCents: 0,
    totalCollectedCents: 0,
  };

  for (const t of rows) {
    if (!isCounted(t)) {
      totals.voidedCount += 1;
      continue;
    }
    totals.count += 1;
    totals.serviceFeeRevenueCents += t.service_fee_total_cents;
    totals.taxCents += t.tax_cents ?? 0;
    totals.statutoryCents += t.statutory_tag_fee_cents;
    totals.totalCollectedCents += t.total_collected_cents;
  }

  totals.passThroughCents = totals.taxCents + totals.statutoryCents;
  return totals;
}
