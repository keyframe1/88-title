/**
 * Activity-log Data Access Layer (server-only).
 *
 * Every read here is RLS-gated by is_staff(): rows come back ONLY to an
 * authenticated staff caller, and anon has no privilege to the table at all. See
 * supabase/migrations/20260627120000_activity_log.sql.
 *
 * Actor uuids are resolved to display names via the SHARED staff_display_names()
 * RPC (from the transactions migration) - the same helper the transactions ledger
 * uses, not a re-implementation. A raw UUID is never surfaced.
 */
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVITY_PAGE_SIZE,
  type ActivityEntityType,
  type ActivityLog,
  type ActivityLogEntry,
  type ActivityPage,
} from "./types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Resolve a batch of actor auth ids -> staff display names (never a UUID). */
async function resolveActorNames(
  supabase: ServerClient,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.rpc("staff_display_names", {
    p_ids: ids,
  });
  if (error) {
    // Best effort: a name failure must not break the feed. Fall back to "Staff".
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.auth_user_id, row.display_name);
  }
  return map;
}

/** Deduplicated actor ids across a batch of rows. */
function actorIds(rows: readonly ActivityLog[]): string[] {
  return [...new Set(rows.map((r) => r.actor))];
}

/** Attach resolved actor names to raw rows. */
async function withActorNames(
  supabase: ServerClient,
  rows: ActivityLog[],
): Promise<ActivityLogEntry[]> {
  const names = await resolveActorNames(supabase, actorIds(rows));
  return rows.map((r) => ({ ...r, actorName: names.get(r.actor) ?? "Staff" }));
}

/**
 * One page (newest first) of the activity feed, optionally filtered to a single
 * entity type. `page` is zero-based; each page is ACTIVITY_PAGE_SIZE rows. We
 * fetch one extra row to know whether another page follows (hasMore), then trim.
 * Returns an empty page for a non-staff caller (RLS).
 */
export async function getActivityPage(
  entityType: ActivityEntityType | null,
  page: number,
): Promise<ActivityPage> {
  const supabase = await createClient();
  const from = Math.max(0, page) * ACTIVITY_PAGE_SIZE;
  const to = from + ACTIVITY_PAGE_SIZE; // inclusive range → fetches SIZE + 1 rows

  let query = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load activity: ${error.message}`);
  }
  const all: ActivityLog[] = data ?? [];
  const hasMore = all.length > ACTIVITY_PAGE_SIZE;
  const rows = await withActorNames(supabase, all.slice(0, ACTIVITY_PAGE_SIZE));
  return { rows, hasMore };
}

/**
 * Every activity_log entry for one entity (newest first) - the ledger's per-row
 * "History" affordance. A single filtered select (by entity_type + entity_id)
 * plus the shared actor-name resolution; no other queries. Returns [] for a
 * non-staff caller (RLS).
 */
export async function getActivityForEntity(
  entityType: ActivityEntityType,
  entityId: string,
): Promise<ActivityLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    throw new Error(`Failed to load entity history: ${error.message}`);
  }
  return withActorNames(supabase, data ?? []);
}
