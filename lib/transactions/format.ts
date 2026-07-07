/**
 * Small pure formatters for transactions (no Supabase, safe on client + server).
 */

/**
 * The short, human-facing id shown in confirmations and the ledger, e.g.
 * "3f9a1c2b". The first 8 hex characters of the uuid: short enough to read back
 * over the counter, long enough to disambiguate a day's transactions.
 */
export function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

/** Integer cents as a plain grouped dollar string for CSV, e.g. 667550 -> "6675.50". */
export function centsToCsvDollars(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}
