/**
 * Staff-only tax-engine domain types.
 *
 * TaxRateRow mirrors public.tax_rates (see
 * supabase/migrations/20260622120000_tax_rates.sql) and is the single source of
 * truth the typed Supabase `Database` builds on (lib/supabase/database.types.ts).
 * Like the dealer / check-in / OMV types it carries no Supabase import, so types
 * flow one way and there is no cycle.
 *
 * The rest of the types here describe the PURE calculation surface in
 * lib/tax/rates.ts: the resolved rate book (current rate per jurisdiction) and
 * the itemized fee breakdown. Money is integer CENTS everywhere in the
 * calculation to avoid floating-point drift; only the display layer formats to
 * dollars. Rates are PERCENTS (4.45 = 4.45%), matching the column.
 */

/** The three jurisdiction tiers a rate can belong to. */
export type JurisdictionLevel = "state" | "parish" | "district";

/**
 * One tax_rates row. NOTE: object-literal `type` (not `interface`) on purpose -
 * only type aliases get the implicit index signature postgrest-js's
 * GenericSchema needs (see lib/checkin/types.ts for the same note).
 *
 * `rate` is a PERCENT (4.45 means 4.45%). `parent_jurisdiction` is the parish a
 * district sits inside, and is null for state/parish rows.
 */
export type TaxRateRow = {
  id: string;
  created_at: string;
  updated_at: string;
  jurisdiction_level: JurisdictionLevel;
  jurisdiction_name: string;
  parent_jurisdiction: string | null;
  rate: number;
  effective_date: string;
  note: string | null;
};

/** A jurisdiction's currently-effective rate, resolved for display + math. */
export interface ResolvedRate {
  level: JurisdictionLevel;
  name: string;
  /** Percent, e.g. 4.45 for 4.45%. */
  ratePercent: number;
  note: string | null;
}

/** A parish plus the special districts that sit inside it (if any). */
export interface ParishRate extends ResolvedRate {
  level: "parish";
  districts: ResolvedRate[];
}

/**
 * The resolved, serializable rate book the server hands the staff calculator:
 * the current state rate and the current parish rates (each with its districts).
 * Computed once from the raw rows by buildRateBook().
 */
export interface RateBook {
  /** The date the rates were resolved as-of (YYYY-MM-DD). */
  asOf: string;
  /** The state-level rate, or null if none is configured yet. */
  state: ResolvedRate | null;
  /** Parish rates, sorted by name, each carrying its districts. */
  parishes: ParishRate[];
}

/** One selected 88 Title service fee, in cents (from lib/services.ts). */
export interface ServiceFeeSelection {
  id: string;
  label: string;
  amountCents: number;
}

/** Input to the pure fee/tax calculation. All money in integer cents. */
export interface FeeCalcInput {
  sellingPriceCents: number;
  /** Qualifying trade-in value; reduces the taxable base. */
  tradeInCents: number;
  /** Qualifying rebate; reduces the taxable base. */
  rebateCents: number;
  /** The jurisdictions whose rates apply (state + buyer's parish + districts). */
  appliedRates: ResolvedRate[];
  /** Selected 88 Title service fees. */
  serviceFees: ServiceFeeSelection[];
}

/** One jurisdiction's tax line in the breakdown. */
export interface TaxLine {
  level: JurisdictionLevel;
  name: string;
  ratePercent: number;
  amountCents: number;
}

/**
 * The itemized result. Every amount is integer cents. The statutory public tag
 * fee is its OWN line (publicTagFeeCents), never merged into another amount and
 * never part of the taxable base or any tax line. `passThroughCents` is what is
 * collected for the state/parish (taxes + the $23 tag fee); `agencyCents` is
 * 88 Title's own service-fee revenue.
 */
export interface FeeBreakdown {
  sellingPriceCents: number;
  tradeInCents: number;
  rebateCents: number;
  /** max(0, selling - trade-in - rebate). The base every tax line applies to. */
  taxableCents: number;
  /** One line per applied jurisdiction (state, parish, any districts). */
  taxLines: TaxLine[];
  totalTaxCents: number;
  /** Sum of the applied rate percents, e.g. 9.20 for state + Jefferson. */
  combinedRatePercent: number;
  serviceFeeLines: ServiceFeeSelection[];
  serviceFeesTotalCents: number;
  /** The statutory $23 public tag fee, always its own line, never taxed. */
  publicTagFeeCents: number;
  /** What 88 Title collects at the counter: taxes + service fees + tag fee. */
  totalCents: number;
  /** Pass-through to the state/parish: taxes + the statutory tag fee. */
  passThroughCents: number;
  /** 88 Title revenue: the selected service fees. */
  agencyCents: number;
}
