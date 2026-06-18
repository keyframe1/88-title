/**
 * Staff-only OMV reference-code domain type.
 *
 * Mirrors public.omv_reference (see
 * supabase/migrations/20260620120000_omv_reference.sql) and is the single source
 * of truth the typed Supabase `Database` builds on
 * (lib/supabase/database.types.ts). Like the dealer/check-in types it carries no
 * Supabase import, so types flow one way and there is no cycle.
 */

/**
 * One labeled OMV code slot for one transaction. A transaction can have many of
 * these (a transaction code, a document-type code, a fee code, ...).
 *
 * NOTE: object-literal `type` (not `interface`) on purpose - only type aliases
 * get the implicit index signature postgrest-js's GenericSchema needs (see
 * lib/checkin/types.ts for the same note).
 *
 * `code` is NULL until the team fills it in from the OMV Policy & Procedures
 * manual; it ships empty for every row.
 */
export type OmvReferenceRow = {
  id: string;
  created_at: string;
  updated_at: string;
  /** One of the transaction slugs in lib/checklists.ts. */
  transaction_slug: string;
  /** Short label for the slot, e.g. "Transaction code" / "Fee code". */
  label: string;
  /** The OMV code value, or null when not configured yet. */
  code: string | null;
  /** Optional clarifying note shown alongside the code. */
  note: string | null;
  /** Ordering of the slots within a transaction (ascending). */
  display_order: number;
};
