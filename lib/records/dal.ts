/**
 * Customer & vehicle records Data Access Layer (server-only).
 *
 * Every read here is RLS-gated by is_staff(): rows come back ONLY to an
 * authenticated staff caller, and anon has no privilege to either table at all.
 * See supabase/migrations/20260623120000_customer_vehicle_records.sql.
 *
 * LEAST PRIVILEGE for ID data: the list/search/picker reads select the SAFE
 * projections (CUSTOMER_SUMMARY_COLUMNS / VEHICLE_SUMMARY_COLUMNS), which expose
 * id_last4 but never id_number or date_of_birth. The full, sensitive customer
 * row comes back ONLY from getCustomerById(), used when a clerk opens one record
 * to fill a form. Mutations live in actions.ts.
 */
import { createClient } from "@/lib/supabase/server";
import { nameKey, normalizeVin } from "./normalize";
import {
  CUSTOMER_SUMMARY_COLUMNS,
  VEHICLE_SUMMARY_COLUMNS,
  type Customer,
  type CustomerSummary,
  type RecordsSearchResult,
  type Vehicle,
  type VehicleHistoryEntry,
  type VehicleSummary,
} from "./types";

/** Cap on how many rows a list/search returns - a counter tool, not a report. */
const LIST_LIMIT = 50;
/** Cap on the picker lists handed to the fee calculator. */
const PICKER_LIMIT = 500;

/**
 * Build a safe PostgREST `.or()` ilike clause matching `term` across `columns`.
 * The or() mini-language uses commas, parentheses, and dots as separators, so we
 * wrap the value in double quotes (PostgREST's quoting for reserved characters)
 * and escape any embedded quote/backslash. The surrounding % stay as wildcards.
 */
function orIlike(columns: readonly string[], term: string): string {
  const value = `"%${term.replace(/["\\]/g, (ch) => `\\${ch}`)}%"`;
  return columns.map((col) => `${col}.ilike.${value}`).join(",");
}

/**
 * Search customers by name (and incidentally phone/email), newest-updated first.
 * Safe projection only. An empty query returns the most recently touched rows so
 * the console always has something to show.
 */
export async function searchCustomers(
  query: string,
): Promise<CustomerSummary[]> {
  const supabase = await createClient();
  let q = supabase
    .from("customers")
    .select(CUSTOMER_SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(LIST_LIMIT);

  const term = query.trim();
  if (term) {
    q = q.or(orIlike(["full_name", "phone", "email"], term));
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(`Failed to search customers: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Search vehicles by VIN (and incidentally make/model), newest-updated first.
 * Safe projection only. The query is matched both as typed (against make/model)
 * and VIN-normalized, so a clerk can paste a VIN with stray spaces/dashes and
 * still match.
 */
export async function searchVehicles(query: string): Promise<VehicleSummary[]> {
  const supabase = await createClient();
  let q = supabase
    .from("vehicles")
    .select(VEHICLE_SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(LIST_LIMIT);

  const term = query.trim();
  if (term) {
    const conditions = [orIlike(["make", "model"], term)];
    const vin = normalizeVin(term);
    if (vin) conditions.push(orIlike(["vin"], vin));
    q = q.or(conditions.join(","));
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(`Failed to search vehicles: ${error.message}`);
  }
  return data ?? [];
}

/** Run both searches for the staff console (by name and/or VIN). */
export async function searchRecords(
  query: string,
): Promise<RecordsSearchResult> {
  const [customers, vehicles] = await Promise.all([
    searchCustomers(query),
    searchVehicles(query),
  ]);
  return { customers, vehicles };
}

/**
 * The FULL customer row, including the sensitive id_number / date_of_birth. Used
 * when a clerk opens one record to fill a form. Returns null when not found (or
 * the caller is not staff, in which case RLS yields no row).
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load customer: ${error.message}`);
  }
  return data ?? null;
}

/** A single vehicle row by id, or null. Vehicles carry no sensitive fields. */
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load vehicle: ${error.message}`);
  }
  return data ?? null;
}

/**
 * Look up a vehicle by VIN (normalized), or null. The match-and-reuse read used
 * by find-or-create and by the VIN box on the add-vehicle form.
 */
export async function getVehicleByVin(vin: string): Promise<Vehicle | null> {
  const normalized = normalizeVin(vin);
  if (!normalized) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("vin", normalized)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to look up VIN: ${error.message}`);
  }
  return data ?? null;
}

/**
 * Customer-match candidates for find-or-create: same normalized name AND a
 * matching email or phone (a name alone is too weak to merge two people). Safe
 * projection. Empty when neither email nor phone is provided.
 */
export async function findCustomerMatches(
  fullName: string,
  email: string | null,
  phone: string | null,
): Promise<CustomerSummary[]> {
  if (!email && !phone) return [];
  const supabase = await createClient();

  // Filter by the normalized name in SQL (indexed, small result set), then match
  // the contact in JS. Doing the contact compare here - rather than in a
  // PostgREST .or() - sidesteps phone strings like "(504) 555-1212" whose commas
  // and parentheses are reserved characters in the or() mini-language.
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SUMMARY_COLUMNS)
    .eq("name_key", nameKey(fullName))
    .limit(LIST_LIMIT);
  if (error) {
    throw new Error(`Failed to match customer: ${error.message}`);
  }

  return (data ?? []).filter(
    (row) =>
      (email !== null && row.email === email) ||
      (phone !== null && row.phone === phone),
  );
}

/** Safe customer picks for the fee calculator (id, name, parish, ...). */
export async function getCustomerPicks(): Promise<CustomerSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SUMMARY_COLUMNS)
    .order("full_name", { ascending: true })
    .limit(PICKER_LIMIT);
  if (error) {
    throw new Error(`Failed to load customers: ${error.message}`);
  }
  return data ?? [];
}

/** Safe vehicle picks for the fee calculator (id, vin, year/make/model/...). */
export async function getVehiclePicks(): Promise<VehicleSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(PICKER_LIMIT);
  if (error) {
    throw new Error(`Failed to load vehicles: ${error.message}`);
  }
  return data ?? [];
}

/**
 * A vehicle's history: the transactions that referenced it, newest first. Today
 * that is the linked check-in rows (staff-only via RLS); the dealer-transaction
 * source links the same way and can be folded in here when that console lands.
 */
export async function getVehicleHistory(
  vehicleId: string,
): Promise<VehicleHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .select("id, created_at, service_type, status, customer_id")
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to load vehicle history: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    source: "checkin",
    id: row.id,
    created_at: row.created_at,
    kind: row.service_type,
    status: row.status,
    customer_id: row.customer_id,
  }));
}
