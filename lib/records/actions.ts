"use server";

/**
 * Customer & vehicle records server actions (mutations). Server-side is the real
 * trust boundary: every action re-resolves identity via the DAL and refuses a
 * non-staff caller, on top of the database's is_staff() RLS. See
 * supabase/migrations/20260623120000_customer_vehicle_records.sql.
 *
 *   - createCustomer  staff: find-or-create by name + (email|phone), no dupes.
 *   - createVehicle   staff: find-or-create by VIN (the natural key), enrich blanks.
 *   - searchRecordsAction  staff: name/VIN search for the console (safe projection).
 *   - attachRecordsToCheckin  staff: link a customer/vehicle to a check-in row.
 *
 * attachRecordsToCheckin is wired and enforced now; the queue UI button that
 * calls it lands with the records detail view (mirrors updateTransactionStatus).
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDealerContext } from "@/lib/dealers/dal";
import { findCustomerMatches, getVehicleByVin, searchRecords } from "./dal";
import { isPlausibleVin, normalizeName, normalizeVin } from "./normalize";
import {
  CUSTOMER_ID_TYPES,
  type AttachRecordsInput,
  type CustomerFormState,
  type CustomerIdType,
  type RecordsSearchResult,
  type VehicleFormState,
} from "./types";

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Trim a form value to a string, or null when blank. */
function str(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : null;
}

/** Parse a constrained id_type, or null when absent/unknown. */
function parseIdType(value: FormDataEntryValue | null): CustomerIdType | null {
  const s = typeof value === "string" ? value.trim() : "";
  return (CUSTOMER_ID_TYPES as readonly string[]).includes(s)
    ? (s as CustomerIdType)
    : null;
}

/** Parse an optional integer model year within a sane range. */
function parseYear(value: FormDataEntryValue | null): number | null {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isInteger(n) || n < 1900 || n > 2100) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const ctx = await getDealerContext();
  if (!ctx) return { error: "Your session expired. Please sign in again." };
  if (!ctx.isStaff) return { error: "Only staff can add customer records." };

  const fullNameRaw = str(formData.get("full_name"));
  if (!fullNameRaw) {
    return { error: "Enter the customer's name." };
  }
  const fullName = normalizeName(fullNameRaw);
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));

  // Match-and-reuse: a repeat customer is reused, not duplicated. Name alone is
  // too weak (two John Smiths), so we reuse only on normalized name PLUS a
  // matching email or phone; otherwise we create a fresh record.
  const matches = await findCustomerMatches(fullName, email, phone);
  if (matches.length > 0) {
    return { ok: true, customerId: matches[0].id, reused: true };
  }

  const dobRaw = str(formData.get("date_of_birth"));
  const dob = dobRaw && DOB_RE.test(dobRaw) ? dobRaw : null;

  const supabase = await createClient();
  // RLS WITH CHECK re-verifies is_staff(); name_key and id_last4 are generated
  // by the database and are never written here.
  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: fullName,
      email,
      phone,
      address_line1: str(formData.get("address_line1")),
      address_line2: str(formData.get("address_line2")),
      city: str(formData.get("city")),
      state: str(formData.get("state")) ?? "LA",
      postal_code: str(formData.get("postal_code")),
      parish: str(formData.get("parish")),
      id_type: parseIdType(formData.get("id_type")),
      id_number: str(formData.get("id_number")),
      id_state: str(formData.get("id_state")),
      date_of_birth: dob,
      notes: str(formData.get("notes")),
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Could not save the customer: ${error.message}` };
  }

  revalidatePath("/staff/records");
  revalidatePath("/staff/fees");
  return { ok: true, customerId: data.id, reused: false };
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export async function createVehicle(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const ctx = await getDealerContext();
  if (!ctx) return { error: "Your session expired. Please sign in again." };
  if (!ctx.isStaff) return { error: "Only staff can add vehicle records." };

  const vinRaw = str(formData.get("vin"));
  if (!vinRaw) return { error: "Enter the VIN." };
  if (!isPlausibleVin(vinRaw)) {
    return { error: "That VIN doesn't look right (5-17 letters and numbers)." };
  }
  const vin = normalizeVin(vinRaw);

  const year = parseYear(formData.get("year"));
  const make = str(formData.get("make"));
  const model = str(formData.get("model"));
  const bodyStyle = str(formData.get("body_style"));
  const color = str(formData.get("color"));
  const notes = str(formData.get("notes"));

  const supabase = await createClient();

  // Match-and-reuse: the VIN is the natural key. If we already have this VIN,
  // reuse the row and fill in only the fields that were still blank (e.g. an
  // NHTSA decode adding make/model), never clobbering existing data.
  const existing = await getVehicleByVin(vin);
  if (existing) {
    const patch: {
      year?: number | null;
      make?: string | null;
      model?: string | null;
      body_style?: string | null;
      color?: string | null;
      notes?: string | null;
    } = {};
    if (existing.year == null && year != null) patch.year = year;
    if (!existing.make && make) patch.make = make;
    if (!existing.model && model) patch.model = model;
    if (!existing.body_style && bodyStyle) patch.body_style = bodyStyle;
    if (!existing.color && color) patch.color = color;
    if (!existing.notes && notes) patch.notes = notes;

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase
        .from("vehicles")
        .update(patch)
        .eq("id", existing.id);
      if (updateError) {
        return { error: `Could not update the vehicle: ${updateError.message}` };
      }
    }
    revalidatePath("/staff/records");
    revalidatePath("/staff/fees");
    return { ok: true, vehicleId: existing.id, reused: true };
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({ vin, year, make, model, body_style: bodyStyle, color, notes })
    .select("id")
    .single();

  if (error) {
    return { error: `Could not save the vehicle: ${error.message}` };
  }

  revalidatePath("/staff/records");
  revalidatePath("/staff/fees");
  return { ok: true, vehicleId: data.id, reused: false };
}

// ---------------------------------------------------------------------------
// Search (for the staff console)
// ---------------------------------------------------------------------------

export async function searchRecordsAction(
  query: string,
): Promise<RecordsSearchResult> {
  const ctx = await getDealerContext();
  if (!ctx || !ctx.isStaff) {
    return { customers: [], vehicles: [] };
  }
  // The DAL is server-only and RLS-gated regardless; this is the explicit gate.
  return searchRecords(query);
}

// ---------------------------------------------------------------------------
// Link records to a transaction (a check-in row)
// ---------------------------------------------------------------------------

export async function attachRecordsToCheckin(
  input: AttachRecordsInput,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getDealerContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (!ctx.isStaff) {
    return { ok: false, error: "Only staff can link records to a check-in." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .update({
      customer_id: input.customerId ?? null,
      vehicle_id: input.vehicleId ?? null,
    })
    .eq("id", input.checkinId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Check-in not found." };

  revalidatePath("/staff/queue");
  return { ok: true };
}
