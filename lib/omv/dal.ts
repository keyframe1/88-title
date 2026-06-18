/**
 * OMV reference Data Access Layer (server-only).
 *
 * One read path: getOmvReference() returns every reference row for the staff
 * console. RLS (using (is_staff())) means rows come back ONLY to an authenticated
 * staff caller - anyone else gets an empty list, and anon has no privilege to the
 * table at all. See supabase/migrations/20260620120000_omv_reference.sql.
 */
import { createClient } from "@/lib/supabase/server";
import type { OmvReferenceRow } from "./types";

/**
 * All OMV reference rows, ordered for grouping. Returns rows only to a staff
 * caller (RLS); the page groups them by transaction with groupOmvReference().
 */
export async function getOmvReference(): Promise<OmvReferenceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("omv_reference")
    .select("*")
    .order("transaction_slug", { ascending: true })
    .order("display_order", { ascending: true });
  if (error) {
    throw new Error(`Failed to load OMV reference: ${error.message}`);
  }
  return data ?? [];
}
