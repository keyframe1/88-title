/**
 * Transactions Data Access Layer (server-only).
 *
 * Every read here is RLS-gated by is_staff(): rows come back ONLY to an
 * authenticated staff caller, and anon has no privilege to the table at all. See
 * supabase/migrations/20260625120000_transactions.sql.
 *
 * getTransactionsForDay() powers the ledger + reconciliation report: it pulls
 * one business-day's transactions and resolves the two display strings the
 * report needs - the processed-by STAFF name (via the staff_display_names RPC,
 * never a raw UUID) and the linked customer's name (batch-fetched from the
 * staff-only customers table). Names are resolved separately rather than via a
 * PostgREST embed to keep the hand-written Database types simple and strict.
 */
import { createClient } from "@/lib/supabase/server";
import { businessDayWindow } from "./day";
import type { LedgerRow, Transaction } from "./types";

/** Deduplicated, non-null ids pulled off a column of rows. */
function idsFrom(
  rows: readonly Transaction[],
  pick: (t: Transaction) => string | null,
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const id = pick(row);
    if (id) set.add(id);
  }
  return [...set];
}

/** Resolve auth user ids -> staff display names (never a UUID). */
async function resolveStaffNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.rpc("staff_display_names", {
    p_ids: ids,
  });
  if (error) {
    // Best effort: a name failure must not break the ledger. Fall back below.
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.auth_user_id, row.display_name);
  }
  return map;
}

/** Resolve customer ids -> full names (staff-only customers table, RLS-gated). */
async function resolveCustomerNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name")
    .in("id", ids);
  if (error) return map;
  for (const row of data ?? []) {
    map.set(row.id, row.full_name);
  }
  return map;
}

/**
 * One business-day's transactions (chronological), with processed-by and
 * customer names resolved for display. `day` is a YYYY-MM-DD business-local date.
 * Returns [] for a non-staff caller (RLS).
 */
export async function getTransactionsForDay(day: string): Promise<LedgerRow[]> {
  const supabase = await createClient();
  const { startIso, endIso } = businessDayWindow(day);

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }
  const rows: Transaction[] = data ?? [];

  const [staffNames, customerNames] = await Promise.all([
    resolveStaffNames(supabase, idsFrom(rows, (t) => t.processed_by)),
    resolveCustomerNames(supabase, idsFrom(rows, (t) => t.customer_id)),
  ]);

  return rows.map((t) => ({
    ...t,
    processedByName: staffNames.get(t.processed_by) ?? "Staff",
    customerName: t.customer_id
      ? (customerNames.get(t.customer_id) ?? null)
      : null,
  }));
}

/** The current staff member's own display name (for the report's "prepared by"). */
export async function getStaffDisplayName(userId: string): Promise<string> {
  const supabase = await createClient();
  const names = await resolveStaffNames(supabase, [userId]);
  return names.get(userId) ?? "Staff";
}
