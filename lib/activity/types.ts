/**
 * Append-only staff activity-log domain types.
 *
 * Mirrors public.activity_log (see
 * supabase/migrations/20260627120000_activity_log.sql) and is the single source
 * of truth the typed Supabase `Database` builds on (lib/supabase/database.types.ts).
 * Like the dealer / check-in / records / transactions types it carries no
 * Supabase import, so types flow one way and there is no cycle.
 *
 * NOTE: the Row shape is an object-literal `type` alias (not an `interface`) on
 * purpose - only type aliases get the implicit index signature postgrest-js's
 * GenericSchema needs (see lib/dealers/types.ts for the same note).
 */

/** Which system an activity_log row's entity_id points into. */
export type ActivityEntityType =
  | "customer"
  | "vehicle"
  | "checkin"
  | "transaction"
  | "dealer_transaction";

export const ACTIVITY_ENTITY_TYPES: readonly ActivityEntityType[] = [
  "customer",
  "vehicle",
  "checkin",
  "transaction",
  "dealer_transaction",
] as const;

/** Human label per entity type, for the activity view's filter + rows. */
export const ACTIVITY_ENTITY_LABEL: Record<ActivityEntityType, string> = {
  customer: "Customer",
  vehicle: "Vehicle",
  checkin: "Check-in",
  transaction: "Transaction",
  dealer_transaction: "Dealer transaction",
};

/**
 * Optional structured context stored on a log row (jsonb). A loose bag on
 * purpose - each action writes the few keys that matter for it (ticket code,
 * new status, amount, void reason, a snapshot of a since-deleted record). Never
 * required; the human-readable `summary` is always sufficient on its own.
 */
export type ActivityDetail = Record<string, unknown>;

/**
 * A full activity_log row, as STAFF and server code see it. `actor` is an auth
 * user id; it is resolved to a display name for rendering (never shown raw).
 * `id` is a bigint identity (a JS number: monotonic, safely within range).
 */
export type ActivityLog = {
  id: number;
  created_at: string;
  actor: string;
  action: string;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  summary: string;
  detail: ActivityDetail | null;
};

/**
 * An activity_log row plus the resolved actor display name the view renders
 * (staff_users.full_name, then the auth email, then "Staff" - never a UUID).
 * Built by the DAL via the shared staff_display_names() RPC.
 */
export interface ActivityLogEntry extends ActivityLog {
  actorName: string;
}

/** One page of the activity feed (50 rows) plus whether another page follows. */
export interface ActivityPage {
  rows: ActivityLogEntry[];
  hasMore: boolean;
}

/** Rows per page in the activity view. */
export const ACTIVITY_PAGE_SIZE = 50;
