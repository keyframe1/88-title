/**
 * Tax-rate Data Access Layer (server-only).
 *
 * One read path: getTaxRates() returns every tax_rates row for the staff fee &
 * tax engine. RLS (using (is_staff())) means rows come back ONLY to an
 * authenticated staff caller - anyone else gets an empty list, and anon has no
 * privilege to the table at all. See
 * supabase/migrations/20260622120000_tax_rates.sql.
 *
 * The page resolves these raw rows into a current rate book with
 * buildRateBook() (lib/tax/rates.ts); this layer only does the privileged read.
 */
import { createClient } from "@/lib/supabase/server";
import type { TaxRateRow } from "./types";

/**
 * All tax-rate rows (full history). Returns rows only to a staff caller (RLS).
 * Ordered for stable, deterministic resolution; the actual current-rate pick is
 * done in buildRateBook().
 */
export async function getTaxRates(): Promise<TaxRateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_rates")
    .select("*")
    .order("jurisdiction_level", { ascending: true })
    .order("jurisdiction_name", { ascending: true })
    .order("effective_date", { ascending: false });
  if (error) {
    throw new Error(`Failed to load tax rates: ${error.message}`);
  }
  return data ?? [];
}
