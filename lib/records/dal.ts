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
import {
  getTransactionsForCustomer,
  getTransactionsForVehicle,
} from "@/lib/transactions/dal";
import { nameKey, normalizeVin, vehicleLabel } from "./normalize";
import {
  CUSTOMER_SUMMARY_COLUMNS,
  EMPTY_ASSOCIATIONS,
  VEHICLE_SUMMARY_COLUMNS,
  type Customer,
  type CustomerDetail,
  type CustomerSummary,
  type RecordAssociations,
  type RecordsSearchResult,
  type RenewalListEntry,
  type RenewalProfile,
  type Vehicle,
  type VehicleDetail,
  type VehicleHistoryEntry,
  type VehicleSummary,
} from "./types";

/** Cap on how many rows a list/search returns - a counter tool, not a report. */
const LIST_LIMIT = 50;
/** How many rows the search-first console shows by default (the "Recent" lists). */
const RECENT_LIMIT = 12;
/** Cap on the picker lists handed to the fee calculator. */
const PICKER_LIMIT = 500;
/** Cap on the renewal-bearing check-ins scanned for the Renewals view. */
const RENEWAL_SCAN_LIMIT = 2000;

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
  const [associations, renewals] = await Promise.all([
    associationsFor(
      customers.map((c) => c.id),
      vehicles.map((v) => v.id),
    ),
    renewalProfilesFor(customers.map((c) => c.id)),
  ]);
  // A full page (>= the cap) means the search may have been truncated: signal it
  // so the console prompts the clerk to refine rather than silently hiding rows.
  return {
    customers,
    vehicles,
    associations,
    renewals,
    customersCapped: customers.length >= LIST_LIMIT,
    vehiclesCapped: vehicles.length >= LIST_LIMIT,
  };
}

/**
 * The most recently ADDED customers, newest first, for the search-first console's
 * default view. Small cap (RECENT_LIMIT): the full table never renders; search is
 * the way to reach an older record. Ordered by created_at desc (when the record
 * entered the system), distinct from search's updated_at ordering. Safe projection.
 */
export async function recentCustomers(): Promise<CustomerSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SUMMARY_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) {
    throw new Error(`Failed to load recent customers: ${error.message}`);
  }
  return data ?? [];
}

/** The most recently ADDED vehicles, newest first (see recentCustomers). */
export async function recentVehicles(): Promise<VehicleSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_SUMMARY_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) {
    throw new Error(`Failed to load recent vehicles: ${error.message}`);
  }
  return data ?? [];
}

/** The default "Recent" view for the staff console: newest customers + vehicles. */
export async function recentRecords(): Promise<RecordsSearchResult> {
  const [customers, vehicles] = await Promise.all([
    recentCustomers(),
    recentVehicles(),
  ]);
  const [associations, renewals] = await Promise.all([
    associationsFor(
      customers.map((c) => c.id),
      vehicles.map((v) => v.id),
    ),
    renewalProfilesFor(customers.map((c) => c.id)),
  ]);
  // Recent lists use a small dedicated limit; they are never "capped" in the
  // refine-your-search sense, so those flags stay unset.
  return { customers, vehicles, associations, renewals };
}

/**
 * Derive the quiet inline associations the flat console lists show: for each
 * customer, its most-recent associated vehicle's label; for each vehicle, its
 * most-recent associated customer's name. Both come purely from the transaction
 * spine (there is no ownership FK), using the transactions_customer_id /
 * transactions_vehicle_id indexes. Best effort throughout: a hint is a nicety,
 * and the transactions table may not even be present in an environment that has
 * records - so any failure yields empty maps rather than breaking the console.
 */
export async function associationsFor(
  customerIds: string[],
  vehicleIds: string[],
): Promise<RecordAssociations> {
  if (customerIds.length === 0 && vehicleIds.length === 0) {
    return EMPTY_ASSOCIATIONS;
  }
  const supabase = await createClient();
  const customerVehicle: Record<string, string> = {};
  const vehicleCustomer: Record<string, string> = {};

  // customer -> most-recent vehicle it transacted with.
  if (customerIds.length > 0) {
    try {
      const { data } = await supabase
        .from("transactions")
        .select("customer_id, vehicle_id, created_at")
        .in("customer_id", customerIds)
        .not("vehicle_id", "is", null)
        .order("created_at", { ascending: false });
      const recentVehicleByCustomer = new Map<string, string>();
      for (const row of data ?? []) {
        if (
          row.customer_id &&
          row.vehicle_id &&
          !recentVehicleByCustomer.has(row.customer_id)
        ) {
          recentVehicleByCustomer.set(row.customer_id, row.vehicle_id);
        }
      }
      const neededVehicleIds = [...new Set(recentVehicleByCustomer.values())];
      if (neededVehicleIds.length > 0) {
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select(VEHICLE_SUMMARY_COLUMNS)
          .in("id", neededVehicleIds);
        const labelById = new Map<string, string>();
        for (const v of vehicles ?? []) labelById.set(v.id, vehicleLabel(v));
        for (const [cid, vid] of recentVehicleByCustomer) {
          const label = labelById.get(vid);
          if (label) customerVehicle[cid] = label;
        }
      }
    } catch {
      // Best effort: leave customerVehicle empty on any failure.
    }
  }

  // vehicle -> most-recent customer it transacted with (the mirror).
  if (vehicleIds.length > 0) {
    try {
      const { data } = await supabase
        .from("transactions")
        .select("vehicle_id, customer_id, created_at")
        .in("vehicle_id", vehicleIds)
        .not("customer_id", "is", null)
        .order("created_at", { ascending: false });
      const recentCustomerByVehicle = new Map<string, string>();
      for (const row of data ?? []) {
        if (
          row.vehicle_id &&
          row.customer_id &&
          !recentCustomerByVehicle.has(row.vehicle_id)
        ) {
          recentCustomerByVehicle.set(row.vehicle_id, row.customer_id);
        }
      }
      const neededCustomerIds = [...new Set(recentCustomerByVehicle.values())];
      if (neededCustomerIds.length > 0) {
        const { data: customers } = await supabase
          .from("customers")
          .select("id, full_name")
          .in("id", neededCustomerIds);
        const nameById = new Map<string, string>();
        for (const c of customers ?? []) nameById.set(c.id, c.full_name);
        for (const [vid, cid] of recentCustomerByVehicle) {
          const name = nameById.get(cid);
          if (name) vehicleCustomer[vid] = name;
        }
      }
    } catch {
      // Best effort: leave vehicleCustomer empty on any failure.
    }
  }

  return { customerVehicle, vehicleCustomer };
}

// ---------------------------------------------------------------------------
// Renewals (profile-first, then derived from public.checkins)
// ---------------------------------------------------------------------------
//
// renewal_date + marketing_consent are now CANONICAL columns on customers (see
// 20260701120000_customer_graph.sql): the values a clerk sets directly, seeded by
// the check-in backfill / copy-forward. A customer's effective renewal profile is
// therefore PROFILE-FIRST: if the customer row carries a renewal_date it wins;
// otherwise we fall back to their most-recent renewal-bearing check-in (the
// original retention capture, linked via checkins.customer_id). Staff-only via
// RLS; best-effort throughout, so the console still works if a table is absent.

/**
 * Derive the effective renewal profile for each of `customerIds`, PROFILE-FIRST:
 * the customer's own renewal_date/marketing_consent when set, else their
 * most-recent renewal-bearing check-in. Customers with neither are absent.
 */
export async function renewalProfilesFor(
  customerIds: string[],
): Promise<Record<string, RenewalProfile>> {
  if (customerIds.length === 0) return {};
  const out: Record<string, RenewalProfile> = {};
  try {
    const supabase = await createClient();

    // 1. Profile-authoritative: a customer whose profile carries a renewal_date.
    const { data: profiles } = await supabase
      .from("customers")
      .select("id, renewal_date, marketing_consent")
      .in("id", customerIds)
      .not("renewal_date", "is", null);
    for (const row of profiles ?? []) {
      if (row.renewal_date) {
        out[row.id] = {
          renewalDate: row.renewal_date,
          consent: Boolean(row.marketing_consent),
        };
      }
    }

    // 2. Fall back to the check-in capture ONLY where the profile is still empty.
    const missing = customerIds.filter((id) => !out[id]);
    if (missing.length > 0) {
      const { data } = await supabase
        .from("checkins")
        .select("customer_id, renewal_date, marketing_consent, created_at")
        .in("customer_id", missing)
        .not("renewal_date", "is", null)
        .order("created_at", { ascending: false });
      // Newest first, so the first row seen for a customer is their latest capture.
      for (const row of data ?? []) {
        if (row.customer_id && row.renewal_date && !out[row.customer_id]) {
          out[row.customer_id] = {
            renewalDate: row.renewal_date,
            consent: Boolean(row.marketing_consent),
          };
        }
      }
    }
  } catch {
    // Best effort: no renewal profiles rather than a broken console.
  }
  return out;
}

// ---------------------------------------------------------------------------
// Explicit customer <-> vehicle links (public.customer_vehicles)
// ---------------------------------------------------------------------------
//
// The staff-curated join table. These reads return the LINKED records' safe
// summaries (most-recently-linked first); the panel action merges them with the
// transaction-derived (implicit) links, marking each. Staff-only via RLS.

// Best-effort: the join table is new, so an environment that has records but has
// not yet applied 20260701120000 should still open a panel (just with no explicit
// links) rather than break. Any failure yields [] - the transaction-derived links
// still render. This mirrors associationsFor's best-effort contract.

/** Explicit (staff-made) linked vehicles for a customer, most-recent link first. */
export async function explicitVehiclesForCustomer(
  customerId: string,
): Promise<VehicleSummary[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_vehicles")
      .select("vehicle_id, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) return [];
    const ids = (data ?? []).map((r) => r.vehicle_id);
    if (ids.length === 0) return [];
    const summaries = await getVehicleSummariesByIds(ids);
    const byId = new Map(summaries.map((v) => [v.id, v]));
    return ids
      .map((id) => byId.get(id))
      .filter((v): v is VehicleSummary => Boolean(v));
  } catch {
    return [];
  }
}

/** Explicit (staff-made) linked customers for a vehicle, most-recent link first. */
export async function explicitCustomersForVehicle(
  vehicleId: string,
): Promise<CustomerSummary[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_vehicles")
      .select("customer_id, created_at")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });
    if (error) return [];
    const ids = (data ?? []).map((r) => r.customer_id);
    if (ids.length === 0) return [];
    const summaries = await getCustomerSummariesByIds(ids);
    const byId = new Map(summaries.map((c) => [c.id, c]));
    return ids
      .map((id) => byId.get(id))
      .filter((c): c is CustomerSummary => Boolean(c));
  } catch {
    return [];
  }
}

/**
 * The Renewals view: every customer who consented to a renewal reminder AND has
 * a known renewal_date, each with their contact and most-recent associated
 * vehicle, sorted soonest first. PROFILE-FIRST: a customer whose profile carries
 * a renewal_date is authoritative (so a clerk's explicit set/clear wins); every
 * other customer falls back to their most-recent renewal-bearing check-in (so a
 * later opt-out or renewal correction wins). Only consented, still-existing
 * customer records make the list. Best-effort: returns [] if a table is absent.
 */
export async function getRenewalList(): Promise<RenewalListEntry[]> {
  const profiles: Record<string, RenewalProfile> = {};
  try {
    const supabase = await createClient();

    // 1. Profile-authoritative renewals (customers with renewal_date set).
    const { data: profileRows } = await supabase
      .from("customers")
      .select("id, renewal_date, marketing_consent")
      .not("renewal_date", "is", null)
      .limit(RENEWAL_SCAN_LIMIT);
    for (const row of profileRows ?? []) {
      if (row.renewal_date) {
        profiles[row.id] = {
          renewalDate: row.renewal_date,
          consent: Boolean(row.marketing_consent),
        };
      }
    }

    // 2. Check-in-derived renewals fill only customers whose profile is empty.
    const { data } = await supabase
      .from("checkins")
      .select("customer_id, renewal_date, marketing_consent, created_at")
      .not("renewal_date", "is", null)
      .not("customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(RENEWAL_SCAN_LIMIT);
    // Most-recent capture per customer (rows are newest first).
    for (const row of data ?? []) {
      if (row.customer_id && row.renewal_date && !profiles[row.customer_id]) {
        profiles[row.customer_id] = {
          renewalDate: row.renewal_date,
          consent: Boolean(row.marketing_consent),
        };
      }
    }
  } catch {
    return [];
  }

  // Consented only. A customer whose latest renewal capture opted out is excluded.
  const consentedIds = Object.keys(profiles).filter((id) => profiles[id].consent);
  if (consentedIds.length === 0) return [];

  // Resolve the customer records (RLS-gated) and their most-recent vehicle. A
  // customer whose record was deleted drops out here (the check-in survives).
  const [customers, associations] = await Promise.all([
    getCustomerSummariesByIds(consentedIds),
    associationsFor(consentedIds, []),
  ]);
  const byId = new Map(customers.map((c) => [c.id, c]));

  const entries: RenewalListEntry[] = [];
  for (const id of consentedIds) {
    const customer = byId.get(id);
    if (!customer) continue;
    entries.push({
      customer,
      renewalDate: profiles[id].renewalDate,
      vehicleLabel: associations.customerVehicle[id] ?? null,
    });
  }
  // Soonest first: ascending by renewal date puts the most overdue / nearest up top.
  entries.sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));
  return entries;
}

/** Total number of customer records (RLS-gated). Best-effort: null on failure. */
export async function countCustomers(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

/** Total number of vehicle records (RLS-gated). Best-effort: null on failure. */
export async function countVehicles(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

/** Safe customer summaries for a set of ids (batch resolve; unordered). */
export async function getCustomerSummariesByIds(
  ids: string[],
): Promise<CustomerSummary[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SUMMARY_COLUMNS)
    .in("id", ids);
  if (error) {
    throw new Error(`Failed to load customers: ${error.message}`);
  }
  return data ?? [];
}

/** Safe vehicle summaries for a set of ids (batch resolve; unordered). */
export async function getVehicleSummariesByIds(
  ids: string[],
): Promise<VehicleSummary[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_SUMMARY_COLUMNS)
    .in("id", ids);
  if (error) {
    throw new Error(`Failed to load vehicles: ${error.message}`);
  }
  return data ?? [];
}

/** The distinct non-null values of `pick` across rows, in first-seen order. */
function distinctInOrder<T>(
  rows: readonly T[],
  pick: (row: T) => string | null,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const value = pick(row);
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

/**
 * The full customer detail (hub) view: the record, its transaction history, and
 * the vehicles it has appeared with on those transactions (most recent first,
 * derived from the history itself - no extra association query). Returns null
 * when the customer is not found (or the caller is not staff, via RLS).
 */
export async function getCustomerDetail(
  id: string,
): Promise<CustomerDetail | null> {
  const customer = await getCustomerById(id);
  if (!customer) return null;
  const transactions = await getTransactionsForCustomer(id);
  const orderedVehicleIds = distinctInOrder(transactions, (t) => t.vehicle_id);
  const summaries = await getVehicleSummariesByIds(orderedVehicleIds);
  const byId = new Map(summaries.map((v) => [v.id, v]));
  const vehicles = orderedVehicleIds
    .map((vid) => byId.get(vid))
    .filter((v): v is VehicleSummary => Boolean(v));
  return { customer, transactions, vehicles };
}

/** The full vehicle detail (hub) view - the mirror of getCustomerDetail. */
export async function getVehicleDetail(
  id: string,
): Promise<VehicleDetail | null> {
  const vehicle = await getVehicleById(id);
  if (!vehicle) return null;
  const transactions = await getTransactionsForVehicle(id);
  const orderedCustomerIds = distinctInOrder(transactions, (t) => t.customer_id);
  const summaries = await getCustomerSummariesByIds(orderedCustomerIds);
  const byId = new Map(summaries.map((c) => [c.id, c]));
  const customers = orderedCustomerIds
    .map((cid) => byId.get(cid))
    .filter((c): c is CustomerSummary => Boolean(c));
  return { vehicle, transactions, customers };
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
