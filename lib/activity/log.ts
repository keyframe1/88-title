/**
 * Server-side activity-log writer (server-only; not a server action).
 *
 * logActivity() appends one row to public.activity_log. It is called from inside
 * the staff server actions AFTER their primary mutation has succeeded, and it is
 * fully try/caught: a logging failure is swallowed (console.error only) so it can
 * NEVER block or fail the action that produced the event. The audit trail is
 * best-effort; the primary write is authoritative.
 *
 * The caller passes the Supabase client it already created (so we reuse the same
 * request-scoped, RLS-constrained connection - no extra createClient()) and the
 * actor (always ctx.user.id from the session, never client-supplied). The row's
 * INSERT is still gated by the activity_log is_staff() policy in the database.
 */
import type { createClient } from "@/lib/supabase/server";
import type { ActivityDetail, ActivityEntityType } from "./types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ActivityEntry {
  /** The acting staff member's auth user id (ctx.user.id). */
  actor: string;
  /** A stable machine key, e.g. "customer.update", "transaction.void". */
  action: string;
  entityType: ActivityEntityType;
  /** The affected row id, or null for a since-deleted / non-row event. */
  entityId?: string | null;
  /** Human-readable one-liner (names/amounts already resolved). */
  summary: string;
  /** Optional structured context; omit when there is nothing extra to store. */
  detail?: ActivityDetail | null;
}

/**
 * Append one activity-log row. Never throws: on any failure it logs to the
 * server console and returns, so the calling action is unaffected.
 */
export async function logActivity(
  supabase: ServerClient,
  entry: ActivityEntry,
): Promise<void> {
  try {
    const { error } = await supabase.from("activity_log").insert({
      actor: entry.actor,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      summary: entry.summary,
      detail: entry.detail ?? null,
    });
    if (error) {
      console.error(
        `[activity] could not log ${entry.action}: ${error.message}`,
      );
    }
  } catch (err) {
    // Belt and suspenders: even an unexpected throw must not reach the caller.
    console.error(`[activity] logging threw for ${entry.action}:`, err);
  }
}
