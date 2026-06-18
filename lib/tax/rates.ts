/**
 * Tax-engine pure logic: resolve the current rate book and run the itemized
 * fee & tax calculation. No Supabase import - the DAL (lib/tax/dal.ts) does the
 * privileged read and hands the raw rows here.
 *
 * Two responsibilities:
 *   1. buildRateBook(rows, asOf) - collapse the raw history into the CURRENT
 *      rate per jurisdiction (latest effective_date on or before asOf), grouped
 *      as state + parishes (each carrying its districts).
 *   2. calculateFees(input) - the domicile-based calculation. Taxable amount =
 *      selling price minus qualifying trade-in minus qualifying rebate; the
 *      buyer's looked-up rates apply to that taxable amount. The statutory $23
 *      public tag fee is a separate line, never taxed, never merged.
 *
 * Money is integer CENTS throughout; rates are PERCENTS (4.45 = 4.45%).
 */
import { PUBLIC_TAG_FEE } from "@/lib/services";
import type {
  FeeBreakdown,
  FeeCalcInput,
  ParishRate,
  RateBook,
  ResolvedRate,
  TaxRateRow,
} from "./types";

/** The statutory public tag fee, in cents. Sourced from the single $23 export. */
export const PUBLIC_TAG_FEE_CENTS = Math.round(PUBLIC_TAG_FEE.amount * 100);

/** Convert a dollar amount (possibly with cents) to integer cents, clamped >= 0. */
export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}

/** A rate row is "in effect" as-of a date when its effective_date is not later. */
function isEffective(row: TaxRateRow, asOf: string): boolean {
  return row.effective_date <= asOf;
}

/**
 * Group key for "the same jurisdiction": its level, name, and parent. Distinct
 * effective_date rows for the same key are a rate history; we keep the latest.
 */
function jurisdictionKey(row: TaxRateRow): string {
  return JSON.stringify([
    row.jurisdiction_level,
    row.jurisdiction_name,
    row.parent_jurisdiction ?? "",
  ]);
}

/**
 * Reduce the raw rows to the current row per jurisdiction: among the rows in
 * effect as-of `asOf`, the one with the greatest effective_date wins (ties broken
 * by created_at, then id, so the result is deterministic).
 */
function currentRows(rows: readonly TaxRateRow[], asOf: string): TaxRateRow[] {
  const byKey = new Map<string, TaxRateRow>();
  for (const row of rows) {
    if (!isEffective(row, asOf)) continue;
    const key = jurisdictionKey(row);
    const incumbent = byKey.get(key);
    if (!incumbent || isNewer(row, incumbent)) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()];
}

/** True when `a` should win over `b` as the current rate for a jurisdiction. */
function isNewer(a: TaxRateRow, b: TaxRateRow): boolean {
  if (a.effective_date !== b.effective_date) {
    return a.effective_date > b.effective_date;
  }
  if (a.created_at !== b.created_at) return a.created_at > b.created_at;
  return a.id > b.id;
}

function toResolved(row: TaxRateRow): ResolvedRate {
  return {
    level: row.jurisdiction_level,
    name: row.jurisdiction_name,
    // numeric columns can arrive as string from PostgREST; coerce, never `any`.
    ratePercent: Number(row.rate),
    note: row.note,
  };
}

/**
 * Build the serializable rate book the staff calculator consumes: the current
 * state rate and the current parish rates, each parish carrying the districts
 * that name it as their parent. Parishes and districts are sorted by name.
 */
export function buildRateBook(
  rows: readonly TaxRateRow[],
  asOf: string,
): RateBook {
  const current = currentRows(rows, asOf);

  const stateRow = current.find((row) => row.jurisdiction_level === "state");
  const state = stateRow ? toResolved(stateRow) : null;

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);

  const districtsByParent = new Map<string, ResolvedRate[]>();
  for (const row of current) {
    if (row.jurisdiction_level !== "district" || !row.parent_jurisdiction) {
      continue;
    }
    const list = districtsByParent.get(row.parent_jurisdiction) ?? [];
    list.push(toResolved(row));
    districtsByParent.set(row.parent_jurisdiction, list);
  }

  const parishes: ParishRate[] = current
    .filter((row) => row.jurisdiction_level === "parish")
    .map((row) => ({
      level: "parish" as const,
      name: row.jurisdiction_name,
      ratePercent: Number(row.rate),
      note: row.note,
      districts: (districtsByParent.get(row.jurisdiction_name) ?? []).sort(
        byName,
      ),
    }))
    .sort(byName);

  return { asOf, state, parishes };
}

/**
 * Round a percent to 4 decimals for display, smoothing the float noise from
 * summing rate percents (4.45 + 4.75 should read as 9.2, not 9.2000000001).
 */
function roundPercent(percent: number): number {
  return Math.round(percent * 1e4) / 1e4;
}

/**
 * The domicile-based fee & tax calculation. Pure and total: every amount in the
 * result is integer cents.
 *
 *   taxableCents = max(0, selling - trade-in - rebate)
 *   each tax line = round(taxableCents * ratePercent / 100)
 *   total         = all taxes + service fees + the statutory $23 tag fee
 *
 * The tag fee is never part of the taxable base and never appears as a tax line;
 * it is its own row and is included whole. `appliedRates` is whatever the caller
 * resolved for the buyer's domicile (state + their parish + any chosen district).
 */
export function calculateFees(input: FeeCalcInput): FeeBreakdown {
  const sellingPriceCents = Math.max(0, Math.round(input.sellingPriceCents));
  const tradeInCents = Math.max(0, Math.round(input.tradeInCents));
  const rebateCents = Math.max(0, Math.round(input.rebateCents));

  const taxableCents = Math.max(
    0,
    sellingPriceCents - tradeInCents - rebateCents,
  );

  const taxLines = input.appliedRates.map((rate) => ({
    level: rate.level,
    name: rate.name,
    ratePercent: rate.ratePercent,
    amountCents: Math.round((taxableCents * rate.ratePercent) / 100),
  }));
  const totalTaxCents = taxLines.reduce((sum, line) => sum + line.amountCents, 0);
  const combinedRatePercent = roundPercent(
    input.appliedRates.reduce((sum, rate) => sum + rate.ratePercent, 0),
  );

  const serviceFeeLines = input.serviceFees.map((fee) => ({
    id: fee.id,
    label: fee.label,
    amountCents: Math.max(0, Math.round(fee.amountCents)),
  }));
  const serviceFeesTotalCents = serviceFeeLines.reduce(
    (sum, fee) => sum + fee.amountCents,
    0,
  );

  const publicTagFeeCents = PUBLIC_TAG_FEE_CENTS;
  const passThroughCents = totalTaxCents + publicTagFeeCents;
  const agencyCents = serviceFeesTotalCents;
  const totalCents = totalTaxCents + serviceFeesTotalCents + publicTagFeeCents;

  return {
    sellingPriceCents,
    tradeInCents,
    rebateCents,
    taxableCents,
    taxLines,
    totalTaxCents,
    combinedRatePercent,
    serviceFeeLines,
    serviceFeesTotalCents,
    publicTagFeeCents,
    totalCents,
    passThroughCents,
    agencyCents,
  };
}

/** Format integer cents as a US dollar string, e.g. 667550 -> "$6,675.50". */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Format a percent for display, e.g. 9.2 -> "9.2%", 4.45 -> "4.45%". */
export function formatPercent(percent: number): string {
  return `${roundPercent(percent)}%`;
}
