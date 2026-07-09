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
import type { LedgerRow } from "@/lib/transactions/types";

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
  /**
   * Canonical renewal date (YYYY-MM-DD), or null when not on the profile. When
   * null the renewal reads fall back to the customer's latest renewal-bearing
   * check-in. See supabase/migrations/20260701120000_customer_graph.sql.
   */
  renewal_date: string | null;
  /** Whether the customer consented to a renewal reminder (authoritative when
   *  renewal_date is set; else the check-in-derived consent is used). */
  marketing_consent: boolean;
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
 * A row of public.customer_vehicles: an explicit, staff-made customer<->vehicle
 * link. Distinct from the transaction-derived (implicit) association. See
 * supabase/migrations/20260701120000_customer_graph.sql.
 */
export type CustomerVehicleLink = {
  id: string;
  created_at: string;
  customer_id: string;
  vehicle_id: string;
  created_by: string | null;
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

/**
 * Record-to-record associations derived from the transaction spine (there is
 * deliberately NO ownership FK - a title office's vehicles change hands, so the
 * only honest "who has this been with" is the transaction history). Maps a
 * customer id to its most-recent associated vehicle's label, and a vehicle id to
 * its most-recent associated customer's name, for the quiet inline hints the flat
 * console lists show ("Last: 2003 Honda Accord"). Plain string maps so they
 * serialize cleanly across the server-action boundary.
 */
export interface RecordAssociations {
  /** customerId -> most-recent associated vehicle label (from transactions). */
  customerVehicle: Record<string, string>;
  /** vehicleId -> most-recent associated customer full name (from transactions). */
  vehicleCustomer: Record<string, string>;
}

/** No associations resolved (recent lists / non-staff / records-only fallback). */
export const EMPTY_ASSOCIATIONS: RecordAssociations = {
  customerVehicle: {},
  vehicleCustomer: {},
};

/**
 * A customer's derived renewal profile. There is deliberately NO renewal_date /
 * marketing_consent column on the customers table - those are captured at
 * check-in (public.checkins), the start of the retention database. So a
 * customer's renewal profile is derived from their most-recent renewal-bearing
 * check-in: the renewal_date we last captured, and whether they consented to a
 * reminder at that time. Present only for customers who have such a check-in.
 */
export interface RenewalProfile {
  /** The most-recently captured renewal date (YYYY-MM-DD), from a check-in. */
  renewalDate: string;
  /** Whether that same check-in opted in to a renewal reminder. */
  consent: boolean;
}

/**
 * Combined result of a staff records search (by name and/or VIN), plus the
 * derived inline associations and whether either list hit the DAL row cap. A
 * capped list is a signal to prompt the clerk to refine, never a silent
 * truncation. Recent lists are never capped (their own small limit).
 */
export interface RecordsSearchResult {
  customers: CustomerSummary[];
  vehicles: VehicleSummary[];
  associations: RecordAssociations;
  /** customerId -> derived renewal profile, for the customers list's renewal chip. */
  renewals?: Record<string, RenewalProfile>;
  /** True when the customer list was truncated at the search cap. */
  customersCapped?: boolean;
  /** True when the vehicle list was truncated at the search cap. */
  vehiclesCapped?: boolean;
}

/**
 * One row of the Renewals view: a customer who consented to a renewal reminder
 * and has a known renewal_date (derived from their check-ins). Sorted soonest
 * first by the console. The `vehicleLabel` is their most-recent associated
 * vehicle (from the transaction spine), shown for context; null when none.
 */
export interface RenewalListEntry {
  customer: CustomerSummary;
  /** The captured renewal date (YYYY-MM-DD). */
  renewalDate: string;
  /** Most-recent associated vehicle label, or null. */
  vehicleLabel: string | null;
}

/**
 * One entry in a detail-panel's history list: a transaction this record appears
 * on, slimmed to just what the panel renders (date, service label, status). The
 * heavier LedgerRow (money, PII-adjacent fields) is deliberately NOT sent to the
 * panel - only these three display fields cross to the client.
 */
export interface PanelHistoryEntry {
  id: string;
  created_at: string;
  /** Resolved service label (getTransactionPath), not the raw slug. */
  serviceLabel: string;
  status: "open" | "completed" | "voided";
}

/**
 * How a customer<->vehicle link was formed. "explicit" is a hand-made link in
 * public.customer_vehicles (unlinkable); "implicit" is derived from the shared
 * transaction history (shown for context, no unlink control). See
 * supabase/migrations/20260701120000_customer_graph.sql.
 */
export type RecordLinkType = "explicit" | "implicit";

/** A linked vehicle in a customer panel: the safe summary plus how it was linked. */
export type LinkedVehicle = VehicleSummary & { linkType: RecordLinkType };

/** A linked customer in a vehicle panel: the safe summary plus how it was linked. */
export type LinkedCustomer = CustomerSummary & { linkType: RecordLinkType };

/**
 * The client-safe payload the customer detail panel renders. A SAFE projection:
 * it carries the masked id_last4 but NEVER the full id_number or date_of_birth
 * (the two fields the security model keeps off the client), plus the derived
 * renewal profile, the linked vehicles (explicit links UNION transaction-derived
 * ones), and the recent transaction history.
 */
export interface CustomerPanelData {
  id: string;
  full_name: string;
  parish: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  id_type: CustomerIdType | null;
  id_last4: string | null;
  /** Effective renewal date (YYYY-MM-DD): the profile's, else the latest
   *  renewal-bearing check-in's, else null. */
  renewalDate: string | null;
  /** Effective renewal consent (profile-first, then check-in-derived). */
  consent: boolean;
  /** Whether renewalDate/consent came from the customer profile (vs a check-in). */
  renewalFromProfile: boolean;
  /** Linked vehicles: explicit links first, then transaction-derived (implicit). */
  vehicles: LinkedVehicle[];
  /** Recent transaction history (newest first). */
  history: PanelHistoryEntry[];
}

/** The client-safe payload the vehicle detail panel renders (mirror of the above). */
export interface VehiclePanelData {
  id: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  body_style: string | null;
  color: string | null;
  /** Linked customers: explicit links first, then transaction-derived (implicit). */
  customers: LinkedCustomer[];
  history: PanelHistoryEntry[];
}

/**
 * Everything the customer detail (hub) view renders: the full record, its
 * transaction history (the ledger row treatment), and the vehicles it has
 * appeared with on those transactions (most recent first). "Associated" is
 * derived purely from transaction history - see RecordAssociations.
 */
export interface CustomerDetail {
  customer: Customer;
  transactions: LedgerRow[];
  /** Vehicles from this customer's past transactions, most recent first. */
  vehicles: VehicleSummary[];
}

/** Everything the vehicle detail (hub) view renders - the mirror of CustomerDetail. */
export interface VehicleDetail {
  vehicle: Vehicle;
  transactions: LedgerRow[];
  /** Customers from this vehicle's past transactions, most recent first. */
  customers: CustomerSummary[];
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

/**
 * The editable customer fields handed to the edit form. Deliberately OMITS the
 * full id_number - the one field the security model keeps off the client. The
 * form shows the masked id_last4 and replaces the number only when staff type a
 * new one (blank = keep on file). date_of_birth IS included so it can be
 * corrected in place. Loaded for a single opened record (loadCustomerForEdit).
 */
export type CustomerEditData = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string;
  postal_code: string | null;
  parish: string | null;
  id_type: CustomerIdType | null;
  id_state: string | null;
  /** Masked fragment for display; the full id_number is never sent to the client. */
  id_last4: string | null;
  date_of_birth: string | null;
  notes: string | null;
  /** Canonical renewal date (YYYY-MM-DD) on the profile, or null. */
  renewal_date: string | null;
  /** Whether the customer consented to a renewal reminder. */
  marketing_consent: boolean;
};

/** Result of a record edit/delete mutation (no useActionState round-trip needed). */
export interface RecordMutationResult {
  ok: boolean;
  error?: string;
}

/** Input for linking a customer/vehicle record to a check-in transaction row. */
export interface AttachRecordsInput {
  checkinId: string;
  customerId?: string | null;
  vehicleId?: string | null;
}
