/**
 * Transactions domain types - the auditable spine tying together the queue,
 * records, fee engine, and forms.
 *
 * Mirrors public.transactions (see
 * supabase/migrations/20260625120000_transactions.sql) and is the single source
 * of truth the typed Supabase `Database` builds on (lib/supabase/database.types.ts).
 * Like the dealer / check-in / records / tax types it carries no Supabase import,
 * so types flow one way and there is no cycle.
 *
 * Money is integer CENTS everywhere (matching the fee engine). The fee & tax
 * figures are FROZEN at creation - an audit snapshot, never recomputed - so a
 * transaction always shows what was actually collected on its day, even after a
 * rate change. The statutory $23 tag fee is its own discrete field, never merged.
 *
 * NOTE: the Row shapes are object-literal `type` aliases (not `interface`s) on
 * purpose - only type aliases get the implicit index signature postgrest-js's
 * GenericSchema needs (see lib/dealers/types.ts for the same note).
 */

/** Lifecycle of a transaction. `voided` rows are excluded from day totals. */
export type TransactionStatus = "open" | "completed" | "voided";

export const TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  "open",
  "completed",
  "voided",
] as const;

/**
 * One frozen 88 Title service-fee line captured on a transaction. Mirrors the
 * fee engine's ServiceFeeSelection so the two never drift; stored as a jsonb
 * array on the row (the audit snapshot of what was charged).
 */
export type TransactionServiceFee = {
  id: string;
  label: string;
  amountCents: number;
};

/**
 * A full transaction row, as STAFF and server code see it. processed_by is an
 * auth user id; it is resolved to a display name for rendering (never shown raw).
 */
export type Transaction = {
  id: string;
  created_at: string;
  processed_by: string;
  customer_id: string | null;
  vehicle_id: string | null;
  checkin_id: string | null;
  service_type: string;
  status: TransactionStatus;
  sale_price_cents: number | null;
  trade_in_cents: number | null;
  rebate_cents: number | null;
  taxable_amount_cents: number | null;
  tax_cents: number | null;
  parish: string | null;
  service_fees: TransactionServiceFee[];
  service_fee_total_cents: number;
  /** The statutory $23 public tag fee, in cents (default 2300). Never merged. */
  statutory_tag_fee_cents: number;
  total_collected_cents: number;
  notes: string | null;
  completed_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
};

/**
 * A transaction plus the resolved display strings the ledger/report render:
 * the processed-by staff name (never a UUID) and the linked customer's name (or
 * null when the transaction has no linked record). Built by the DAL.
 */
export interface LedgerRow extends Transaction {
  processedByName: string;
  customerName: string | null;
}

/**
 * The itemized input a capture (from the fee calculator or the forms page)
 * hands the server action. The server RE-COMPUTES the money from these itemized
 * parts (never trusting a client-sent total) and freezes the result on the row.
 * All money in integer cents; rates are the jurisdictions the calculator applied.
 */
export interface RecordTransactionInput {
  /** A lib/checklists.ts transaction slug (e.g. "title-transfer"). */
  serviceType: string;
  parish: string | null;
  salePriceCents: number;
  tradeInCents: number;
  rebateCents: number;
  /** The applied jurisdictions (state + parish + any districts), for the tax. */
  appliedRates: AppliedRate[];
  /** Selected 88 Title service fees, frozen as-is. */
  serviceFees: TransactionServiceFee[];
  customerId?: string | null;
  vehicleId?: string | null;
  checkinId?: string | null;
  notes?: string | null;
}

/**
 * A jurisdiction rate the capture applied, mirroring lib/tax ResolvedRate but
 * declared here so the action's input has no tax-module import cycle. `level` and
 * `name` are informational; `ratePercent` drives the recomputed tax line.
 */
export interface AppliedRate {
  level: "state" | "parish" | "district";
  name: string;
  ratePercent: number;
}

/** Result of a capture (record-transaction) action, for the confirming UI. */
export interface RecordTransactionResult {
  ok: boolean;
  error?: string;
  /** The new transaction id (full), for linking. */
  id?: string;
  /** The short, human-facing id shown in the confirmation (see format.ts). */
  shortId?: string;
}

/** Result of a void (or other simple mutation) on a transaction. */
export interface TransactionMutationResult {
  ok: boolean;
  error?: string;
}

export interface TransactionStatusMeta {
  label: string;
}

export const TRANSACTION_STATUS_META: Record<
  TransactionStatus,
  TransactionStatusMeta
> = {
  open: { label: "Open" },
  completed: { label: "Completed" },
  voided: { label: "Voided" },
};
