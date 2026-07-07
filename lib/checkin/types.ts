/**
 * Public check-in queue domain types and display metadata.
 *
 * Mirrors public.checkins, the public.checkin_queue view, and the token-scoped
 * RPCs (see supabase/migrations/20260618120000_checkin_queue.sql). Like the
 * dealer types, these are the single source of truth the typed Supabase
 * `Database` builds on (lib/supabase/database.types.ts) — types flow one way,
 * with no Supabase import here, so there is no cycle.
 */

export type CheckinStatus =
  | "waiting"
  | "in_progress"
  | "no_show"
  | "complete"
  | "cancelled";

/**
 * Ordered statuses for staff controls / iteration.
 *
 * Lifecycle: waiting -> in_progress -> complete (or cancelled, both terminal).
 * no_show is the one off-ramp that is RECOVERABLE: a called-up customer who did
 * not appear, who can be called again back into in_progress. cancelled stays
 * distinct from no_show (a cancel is final; a no-show is "not yet").
 */
export const CHECKIN_STATUSES: readonly CheckinStatus[] = [
  "waiting",
  "in_progress",
  "no_show",
  "complete",
  "cancelled",
] as const;

/**
 * A browser Web Push subscription, as serialized by PushSubscription.toJSON().
 * Stored (staff-only) on the check-in row; consumed by lib/push/webpush.ts.
 */
export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

/**
 * A customer's OPTIONAL, self-reported document-readiness summary, carried from
 * the /checklist tool into their check-in only when they opt in. Low-sensitivity
 * by design: just WHICH checklist items (document categories) they marked ready
 * for their transaction — never document contents, and no PII beyond what
 * check-in already collects. The transaction is the row's service_type, and
 * "missing" is derived against that transaction's checklist (lib/checklists.ts),
 * so the stored footprint is only the ready ids.
 *
 * Stored (staff-only) on the check-in row as jsonb under the SAME RLS as the
 * other PII: never granted to anon, never on the public board. See
 * supabase/migrations/20260619120000_checkin_readiness.sql.
 */
export type CheckinReadiness = {
  /** Checklist item ids the customer marked ready (a subset of the transaction's items). */
  ready: string[];
};

/**
 * The staff counter checklist tally: which lib/checklists.ts item ids the clerk
 * has confirmed for this check-in. Reference state, not enforcement, and DISTINCT
 * from readiness (which is the customer's own self-reported summary). Stored
 * (staff-only) on the check-in row as a jsonb array; never customer-writable and
 * never on the public board. See
 * supabase/migrations/20260628120000_checkin_checklist.sql.
 */
export type CheckinCheckedItems = string[];

/**
 * A full check-in row. NOTE: object-literal `type` (not `interface`) on purpose
 * — only type aliases get the implicit index signature postgrest-js's
 * GenericSchema needs (see lib/dealers/types.ts for the same note).
 *
 * Anonymous callers can never SELECT the PII fields (column-level grants); the
 * full shape is what STAFF and server code see.
 */
export type Checkin = {
  id: string;
  created_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  service_type: string;
  status: CheckinStatus;
  ticket_code: string;
  session_token: string;
  renewal_date: string | null;
  marketing_consent: boolean;
  push_subscription: PushSubscriptionJSON | null;
  /** Optional, opt-in self-reported checklist readiness; null when not shared. */
  readiness: CheckinReadiness | null;
  /**
   * Staff counter checklist tally: item ids the clerk has confirmed for this
   * check-in (reference state, not enforcement). Staff-only; null when untouched.
   */
  checked_items: CheckinCheckedItems | null;
  /** Optional staff-set link to a customers row (staff-only column). */
  customer_id: string | null;
  /** Optional staff-set link to a vehicles row (staff-only column). */
  vehicle_id: string | null;
  /**
   * When the customer confirmed they are in the lobby (self-service or a staff
   * tap). NULL = on the way. Orthogonal to status; arrival is a timestamp, not a
   * queue state. See supabase/migrations/20260626120000_checkin_arrival.sql.
   */
  arrived_at: string | null;
};

/**
 * Display order for the staff console, shared by the server DAL (initial load)
 * and the client (realtime refetch) so they never disagree. The active counter
 * comes first, then the people still waiting, then no-shows (recoverable), then
 * the terminal states; oldest-first within a status. A single explicit ranking
 * keeps the comparator well-defined now that more than two live statuses exist.
 */
const STAFF_STATUS_RANK: Record<CheckinStatus, number> = {
  in_progress: 0,
  waiting: 1,
  no_show: 2,
  complete: 3,
  cancelled: 4,
};

export function sortStaffQueue(rows: Checkin[]): Checkin[] {
  return [...rows].sort((a, b) => {
    if (a.status !== b.status) {
      return STAFF_STATUS_RANK[a.status] - STAFF_STATUS_RANK[b.status];
    }
    return a.created_at.localeCompare(b.created_at);
  });
}

/** A row of the PII-free public.checkin_queue view (the public live board). */
export type CheckinQueueRow = {
  ticket_code: string;
  service_type: string;
  status: CheckinStatus;
  created_at: string;
  queue_position: number;
};

/** The shape get_checkin(token) returns: the customer's own status + position. */
export type CheckinStatusView = {
  ticket_code: string;
  status: CheckinStatus;
  service_type: string;
  name: string | null;
  created_at: string;
  renewal_date: string | null;
  /** 1-based place in line while waiting; 0 once serving/done. */
  queue_position: number;
  /** People still ahead of you while waiting; 0 once serving/done. */
  ahead: number;
  /** When the customer marked themselves in the lobby; null = on the way. */
  arrived_at: string | null;
};

export type CheckinTone = "waiting" | "serving" | "done" | "cancelled";

export interface CheckinStatusMeta {
  label: string;
  /** Short customer-facing line. */
  description: string;
  tone: CheckinTone;
}

export const CHECKIN_STATUS_META: Record<CheckinStatus, CheckinStatusMeta> = {
  waiting: {
    label: "Waiting",
    description: "You're in line. We'll move you up as the counter opens.",
    tone: "waiting",
  },
  in_progress: {
    label: "You're up",
    description: "Head to the counter. We're ready for you now.",
    tone: "serving",
  },
  no_show: {
    label: "Missed call",
    description:
      "We called your ticket and missed you. Come to the counter and our staff will help you.",
    tone: "cancelled",
  },
  complete: {
    label: "Complete",
    description: "All done. Thanks for visiting 88 Title.",
    tone: "done",
  },
  cancelled: {
    label: "Cancelled",
    description: "This check-in was cancelled.",
    tone: "cancelled",
  },
};

/**
 * Server-action result for the public check-in form (useActionState). On
 * success the client gets the new record's capability token so it can route to
 * the live status page and stash it locally.
 */
export interface CheckInFormState {
  error?: string;
  ok?: boolean;
  token?: string;
  ticketCode?: string;
  position?: number;
}

/** Input/result for the staff-only status-advance action. */
export interface AdvanceStatusInput {
  id: string;
  status: CheckinStatus;
}

export interface AdvanceStatusResult {
  ok: boolean;
  error?: string;
  /** Whether a customer "you're up" email was sent for this change. */
  emailed?: boolean;
  /** Whether a Web Push notification was delivered for this change. */
  pushed?: boolean;
}
