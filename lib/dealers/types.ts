/**
 * Dealer portal domain types and display metadata.
 *
 * These interfaces mirror the `dealers`, `dealer_transactions`, and
 * `staff_users` tables (see supabase/migrations/20260617120000_dealer_portal.sql
 * and 20260629120000_dealer_transactions_board.sql) and are the single source of
 * truth the typed Supabase `Database` builds on (lib/supabase/database.types.ts).
 * Keeping them here — with no Supabase import — avoids a type cycle: types flow
 * one way, types.ts -> database.types.ts.
 */

export type DealerStatus = "active" | "inactive";

/**
 * The dealer transaction pipeline, in order. `needs_attention` is deliberately
 * NOT a status here — it is an orthogonal flag on the row (see DealerTransaction)
 * so a "problem title" keeps its real pipeline position while still flagged.
 */
export type TransactionStatus =
  | "submitted"
  | "received"
  | "in_progress"
  | "ready_for_pickup"
  | "picked_up";

// NOTE: these Row types are `type` aliases, not `interface`s, on purpose — only
// object-literal type aliases get the implicit index signature needed to satisfy
// postgrest-js's `Record<string, unknown>` (GenericSchema) constraint in
// lib/supabase/database.types.ts. An `interface` here collapses inserts to `never`.

/** A dealership account row. */
export type Dealer = {
  id: string;
  created_at: string;
  dealership_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  status: DealerStatus;
  auth_user_id: string | null;
};

/** A single dealer transaction row. */
export type DealerTransaction = {
  id: string;
  dealer_id: string;
  created_at: string;
  /** Free-text vehicle line, kept alongside the structured VIN fields. */
  vehicle_description: string | null;
  transaction_type: string | null;
  status: TransactionStatus;
  /** When `status` last changed (bumped by the staff status-change action). */
  status_updated_at: string;
  /** The "problem title" flag; staff-only write. */
  needs_attention: boolean;
  /** Staff note explaining the attention flag (what the dealer must resolve). */
  attention_note: string | null;
  /** The dealership's own stock number for the deal. */
  stock_number: string | null;
  /** Structured VIN + the fields an NHTSA decode returns. */
  vin: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  notes: string | null;
  /** Optional staff-set link to a customers row (staff-only column). */
  customer_id: string | null;
  /** Optional staff-set link to a vehicles row (staff-only column). */
  vehicle_id: string | null;
};

/** A staff/admin login row. */
export type StaffUser = {
  auth_user_id: string;
  created_at: string;
  full_name: string | null;
  role: "staff" | "admin";
};

/** Ordered pipeline, for the stepper, menus, and iteration. */
export const TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  "submitted",
  "received",
  "in_progress",
  "ready_for_pickup",
  "picked_up",
] as const;

/** Zero-based position of a status in the pipeline (drives the stepper fill). */
export function statusStepIndex(status: TransactionStatus): number {
  const i = TRANSACTION_STATUSES.indexOf(status);
  return i < 0 ? 0 : i;
}

/**
 * Visual + copy treatment per status. `tone` is mapped to concrete styles in
 * components/dealers/StatusBadge.tsx so this module stays presentation-agnostic.
 * `ready_for_pickup` is the highlighted positive state — the "come get it"
 * signal. Attention is a separate flag (StatusTone "attention"), not a status.
 */
export type StatusTone = "neutral" | "progress" | "attention" | "ready" | "done";

export interface TransactionStatusMeta {
  label: string;
  description: string;
  tone: StatusTone;
}

export const TRANSACTION_STATUS_META: Record<
  TransactionStatus,
  TransactionStatusMeta
> = {
  submitted: {
    label: "Submitted",
    description: "Filed and in our queue. We will begin shortly.",
    tone: "neutral",
  },
  received: {
    label: "Received",
    description: "We have your paperwork and have started the file.",
    tone: "neutral",
  },
  in_progress: {
    label: "In progress",
    description: "Your transaction is being worked at the counter.",
    tone: "progress",
  },
  ready_for_pickup: {
    label: "Ready for pickup",
    description: "Completed and ready to pick up at the counter.",
    tone: "ready",
  },
  picked_up: {
    label: "Picked up",
    description: "This transaction is finished and has been picked up.",
    tone: "done",
  },
};

/**
 * Build the display label for a transaction's vehicle: the decoded
 * year/make/model when a VIN was decoded, else the free-text line, else a
 * neutral fallback. Pure, so both the dealer board and the staff console share it.
 */
export function describeVehicle(tx: {
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_description: string | null;
}): string {
  const decoded = [tx.vehicle_year, tx.vehicle_make, tx.vehicle_model]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" ");
  if (decoded) return decoded;
  const free = tx.vehicle_description?.trim();
  if (free) return free;
  return "Vehicle to be confirmed";
}

/**
 * Suggested transaction types for the intake form's datalist. The exact dealer
 * workflow is still being defined, so `transaction_type` is stored as free text;
 * these are hints, not a closed set.
 */
export const TRANSACTION_TYPE_SUGGESTIONS: readonly string[] = [
  "Title transfer",
  "New to Louisiana",
  "Duplicate title",
  "Registration renewal",
  "Plate transfer",
  "Lien recording / payoff",
] as const;

/**
 * Server-action result shapes for useActionState. Declared here (not in the
 * "use server" actions module, which may only export async actions).
 */
export interface AuthFormState {
  error?: string;
  message?: string;
}

export interface TransactionFormState {
  error?: string;
  success?: boolean;
}

/** Input for the staff-only status-change action. */
export interface UpdateStatusInput {
  transactionId: string;
  status: TransactionStatus;
}

/** Input for the staff-only needs-attention toggle. */
export interface UpdateAttentionInput {
  transactionId: string;
  needsAttention: boolean;
  attentionNote?: string | null;
}

/** Result for both staff-only mutations. */
export interface UpdateStatusResult {
  ok: boolean;
  error?: string;
  /** Whether a dealer notification email was sent for this change. */
  emailed?: boolean;
  /** The updated row, so the staff console can reflect it without a refetch. */
  transaction?: DealerTransaction;
}
