/**
 * Staff-only customer & vehicle record domain types.
 *
 * Mirror public.customers and public.vehicles (see
 * supabase/migrations/20260623120000_customer_vehicle_records.sql) and are the
 * single source of truth the typed Supabase `Database` builds on
 * (lib/supabase/database.types.ts). Like the dealer / check-in / OMV / tax types
 * they carry no Supabase import, so types flow one way and there is no cycle.
 *
 * NOTE: the Row shapes are object-literal `type` aliases (not `interface`s) on
 * purpose - only type aliases get the implicit index signature postgrest-js's
 * GenericSchema needs (see lib/dealers/types.ts for the same note).
 */

/** Accepted government-ID kinds. Mirrors the customers.id_type CHECK. */
export type CustomerIdType =
  | "drivers_license"
  | "state_id"
  | "passport"
  | "military_id"
  | "other";

export const CUSTOMER_ID_TYPES: readonly CustomerIdType[] = [
  "drivers_license",
  "state_id",
  "passport",
  "military_id",
  "other",
] as const;

/** Human label per ID type, for menus and display. */
export const CUSTOMER_ID_TYPE_LABEL: Record<CustomerIdType, string> = {
  drivers_license: "Driver's license",
  state_id: "State ID",
  passport: "Passport",
  military_id: "Military ID",
  other: "Other",
};

/**
 * A full customer row, as STAFF and server code see it. id_number and
 * date_of_birth are the sensitive fields: the DAL fetches them only for a single
 * record being opened to fill a form, never in list/search results.
 *
 * name_key and id_last4 are database-GENERATED (read-only); never written.
 */
export type Customer = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  /** Generated normalized name (lowercased, whitespace-collapsed). Read-only. */
  name_key: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string;
  postal_code: string | null;
  /** Parish of residence (domicile). Drives the fee engine's buyer parish. */
  parish: string | null;
  id_type: CustomerIdType | null;
  /** Sensitive. Fetched only for a single opened record (getCustomerById). */
  id_number: string | null;
  id_state: string | null;
  /** Generated last 4 of id_number. The only id fragment list/search expose. */
  id_last4: string | null;
  /** Sensitive. Fetched only for a single opened record. */
  date_of_birth: string | null;
  notes: string | null;
};

/**
 * A full vehicle row. VIN is stored normalized (uppercased, trimmed) and is the
 * unique match-and-reuse key.
 */
export type Vehicle = {
  id: string;
  created_at: string;
  updated_at: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  body_style: string | null;
  color: string | null;
  notes: string | null;
};

/**
 * Safe customer projection for list/search and the fee-engine picker. Carries no
 * sensitive id_number / date_of_birth - only id_last4. This is what crosses to
 * the client.
 */
export type CustomerSummary = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  parish: string | null;
  city: string | null;
  id_type: CustomerIdType | null;
  id_last4: string | null;
  updated_at: string;
};

/** The columns a CustomerSummary selects from public.customers. */
export const CUSTOMER_SUMMARY_COLUMNS =
  "id, full_name, phone, email, parish, city, id_type, id_last4, updated_at";

/** Safe vehicle projection for list/search and the fee-engine picker. */
export type VehicleSummary = {
  id: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  body_style: string | null;
  color: string | null;
  updated_at: string;
};

/** The columns a VehicleSummary selects from public.vehicles. */
export const VEHICLE_SUMMARY_COLUMNS =
  "id, vin, year, make, model, body_style, color, updated_at";

/** Combined result of a staff records search (by name and/or VIN). */
export interface RecordsSearchResult {
  customers: CustomerSummary[];
  vehicles: VehicleSummary[];
}

/**
 * One entry in a vehicle's history: a transaction that referenced this vehicle.
 * Sourced from the linked check-in rows (staff-only). Carries no customer PII
 * beyond the linked customer's display name, resolved separately.
 */
export interface VehicleHistoryEntry {
  /** "checkin" today; the dealer-transaction source is wired the same way. */
  source: "checkin" | "dealer_transaction";
  id: string;
  created_at: string;
  /** Transaction type (service_type slug for check-ins). */
  kind: string;
  status: string;
  /** Linked customer id, if any. */
  customer_id: string | null;
}

/**
 * Server-action result shapes for useActionState. Declared here (not in the
 * "use server" actions module, which may only export async functions). On
 * success each carries the resolved record id and whether it was reused.
 */
export interface CustomerFormState {
  error?: string;
  ok?: boolean;
  /** The resolved customer id (existing match reused, or newly created). */
  customerId?: string;
  /** True when an existing customer was matched and reused rather than created. */
  reused?: boolean;
}

export interface VehicleFormState {
  error?: string;
  ok?: boolean;
  vehicleId?: string;
  reused?: boolean;
}

/** Input for linking a customer/vehicle record to a check-in transaction row. */
export interface AttachRecordsInput {
  checkinId: string;
  customerId?: string | null;
  vehicleId?: string | null;
}
