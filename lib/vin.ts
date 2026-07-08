/**
 * Shared VIN decode against NHTSA's free, no-auth vPIC API.
 *
 * The API is CORS-enabled, so this runs in the browser (no server round-trip,
 * no key). It is the single source of the decode used by both the staff Records
 * console (add/edit vehicle) and the dealer portal's filing form, so a decode
 * behaves identically wherever a VIN is entered. Returns null on any failure;
 * every caller falls back to manual entry.
 *
 * VIN validation helpers (normalizeVin / isStandardVin) live in
 * lib/records/normalize.ts and are imported where needed - kept separate because
 * they are pure string helpers with no network dependency.
 */

/** The subset of NHTSA vPIC DecodeVinValues fields we use. */
export interface DecodedVin {
  make: string;
  model: string;
  year: string;
  body: string;
}

/**
 * Decode a VIN against NHTSA vPIC. Resolves to the decoded fields, or null on
 * any failure (network, non-200, malformed payload, empty result). Callers
 * treat null as "type it in by hand".
 */
export async function decodeVin(vin: string): Promise<DecodedVin | null> {
  const clean = vin.trim();
  if (clean.length < 5) return null;
  const res = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(
      clean,
    )}?format=json`,
  );
  if (!res.ok) return null;
  const json: unknown = await res.json();
  if (typeof json !== "object" || json === null) return null;
  const results = (json as { Results?: unknown }).Results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0];
  if (typeof first !== "object" || first === null) return null;
  const obj = first as Record<string, unknown>;
  const pick = (key: string): string =>
    typeof obj[key] === "string" ? (obj[key] as string).trim() : "";
  return {
    make: pick("Make"),
    model: pick("Model"),
    year: pick("ModelYear"),
    body: pick("BodyClass"),
  };
}
