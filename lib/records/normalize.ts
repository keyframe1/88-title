/**
 * Customer & vehicle record normalization + match helpers (pure, no Supabase).
 *
 * The database mirrors two of these (name_key and the unique upper(vin) index)
 * as GENERATED columns / indexes; we replicate the same normalization in the app
 * so the find-or-create logic looks up by the exact key the database stores. See
 * supabase/migrations/20260623120000_customer_vehicle_records.sql.
 */

/** Collapse whitespace and trim, preserving the original casing for display. */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * The normalized match key for a name: lowercased, whitespace-collapsed. Matches
 * the customers.name_key generated column exactly, so an `.eq("name_key", ...)`
 * lookup finds the same rows the database grouped.
 */
export function nameKey(raw: string): string {
  return normalizeName(raw).toLowerCase();
}

/**
 * Normalize a VIN for storage and lookup: uppercase, strip every non-VIN
 * character (whitespace, dashes). VINs use no I, O, or Q, but we do not reject
 * them here - validation is separate so a clerk can still save an unusual VIN.
 */
export function normalizeVin(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * A loose VIN sanity check used for input validation (not storage). Modern VINs
 * are 17 chars and exclude I/O/Q; older/antique VINs are shorter, so we accept
 * 5-17 alphanumeric characters and only warn on the I/O/Q case at the UI layer.
 */
export function isPlausibleVin(vin: string): boolean {
  const v = normalizeVin(vin);
  return v.length >= 5 && v.length <= 17;
}

/** True for a full 17-char VIN with no I/O/Q (the standard modern format). */
export function isStandardVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizeVin(vin));
}

/**
 * Mask an ID number for display: reveal only the last 4, e.g. "D1234567" ->
 * "••••4567". A null/short value yields a neutral placeholder. Pair with the
 * stored id_last4 when the full number was never fetched.
 */
export function maskIdNumber(idNumber: string | null): string {
  if (!idNumber) return "";
  const last4 = idNumber.slice(-4);
  return `${"•".repeat(4)}${last4}`;
}

/** Mask from a bare last-4 (what list/search expose), e.g. "4567" -> "••••4567". */
export function maskFromLast4(last4: string | null): string {
  if (!last4) return "";
  return `${"•".repeat(4)}${last4}`;
}

/** Build a one-line vehicle label, e.g. "2021 Toyota Camry" or just the VIN. */
export function vehicleLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string;
}): string {
  const parts = [v.year ? String(v.year) : null, v.make, v.model].filter(
    (p): p is string => Boolean(p && p.trim()),
  );
  return parts.length > 0 ? parts.join(" ") : v.vin;
}
