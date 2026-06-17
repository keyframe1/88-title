/**
 * Check-in queue Data Access Layer (server-only).
 *
 * Read paths for the three audiences:
 *   - getCheckinByToken — a customer reading their OWN record via the token-scoped
 *     SECURITY DEFINER RPC (no direct table access; the token is the authorization).
 *   - getPublicQueue — the anonymized public board, from the PII-free view.
 *   - getStaffQueue — the full queue (with PII) for an authenticated staff member;
 *     RLS returns rows only when the caller is staff.
 *
 * Mutations live in actions.ts. Isolation is enforced by RLS + column grants in
 * the database (see supabase/migrations/20260618120000_checkin_queue.sql).
 */
import { createClient } from "@/lib/supabase/server";
import type { Checkin, CheckinQueueRow, CheckinStatusView } from "./types";

/** A customer's own status + live position, or null for an unknown token. */
export async function getCheckinByToken(
  token: string,
): Promise<CheckinStatusView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_checkin", { p_token: token });
  if (error) {
    throw new Error(`Failed to load check-in: ${error.message}`);
  }
  return data?.[0] ?? null;
}

/** The PII-free public live board (waiting + now-serving), ordered for display. */
export async function getPublicQueue(): Promise<CheckinQueueRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkin_queue")
    .select("ticket_code, service_type, status, created_at, queue_position");
  if (error) {
    throw new Error(`Failed to load queue: ${error.message}`);
  }
  return data ?? [];
}

/**
 * The full active queue with customer details, for the staff console. Returns
 * rows only to an authenticated staff caller (RLS); anyone else gets an empty
 * list. in_progress first, then waiting oldest-first.
 */
export async function getStaffQueue(): Promise<Checkin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .in("status", ["waiting", "in_progress"])
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Failed to load staff queue: ${error.message}`);
  }
  const rows = data ?? [];
  return rows.sort((a, b) => {
    if (a.status !== b.status) return a.status === "in_progress" ? -1 : 1;
    return a.created_at.localeCompare(b.created_at);
  });
}
