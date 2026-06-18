/**
 * Dealer portal domain types and display metadata.
 *
 * These interfaces mirror the `dealers`, `dealer_transactions`, and
 * `staff_users` tables (see supabase/migrations/20260617120000_dealer_portal.sql)
 * and are the single source of truth the typed Supabase `Database` builds on
 * (lib/supabase/database.types.ts). Keeping them here — with no Supabase import —
 * avoids a type cycle: types flow one way, types.ts -> database.types.ts.
 */

export type DealerStatus = "active" | "inactive";

export type TransactionStatus =
  | "received"
  | "in_progress"
  | "docs_needed"
  | "ready"
  | "complete";

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
  vehicle_description: string | null;
  transaction_type: string | null;
  status: TransactionStatus;
  docs_needed_note: string | null;
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

/** Ordered list of statuses for menus and iteration. */
export const TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  "received",
  "in_progress",
  "docs_needed",
  "ready",
  "complete",
] as const;

/**
 * Visual + copy treatment per status. `tone` is mapped to concrete styles in
 * components/dealers/StatusBadge.tsx so this module stays presentation-agnostic.
 * `docs_needed` is an attention state and `ready` is the highlighted positive
 * state — the two the dealer most needs to notice.
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
  received: {
    label: "Received",
    description: "We have your request and will begin shortly.",
    tone: "neutral",
  },
  in_progress: {
    label: "In progress",
    description: "Your transaction is being worked on.",
    tone: "progress",
  },
  docs_needed: {
    label: "Docs needed",
    description: "We need additional documents to continue.",
    tone: "attention",
  },
  ready: {
    label: "Ready for pickup",
    description: "Completed and ready to pick up at the counter.",
    tone: "ready",
  },
  complete: {
    label: "Complete",
    description: "This transaction is finished.",
    tone: "done",
  },
};

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

/** Input/result for the staff-only status-change action. */
export interface UpdateStatusInput {
  transactionId: string;
  status: TransactionStatus;
  docsNeededNote?: string | null;
}

export interface UpdateStatusResult {
  ok: boolean;
  error?: string;
  /** Whether a dealer notification email was sent for this change. */
  emailed?: boolean;
}
