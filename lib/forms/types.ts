/**
 * DPSMV form-generation domain types (no Supabase, no pdf-lib import, so types
 * flow one way). The generation request is the small, serializable payload the
 * staff console POSTs; the rest describe the pure mapping output.
 */
import type { DpsmvFormKind } from "./fields";

/**
 * The request a clerk submits to generate one or more filled forms. The customer
 * (primary party: buyer / owner / donee) and vehicle are pulled from saved
 * records by id; the counterparty (seller / donor) and the transaction figures
 * are entered for this transaction. Money fields are dollar strings as typed.
 */
export interface FormGenRequest {
  /** Which forms to produce. Order is preserved in the merged "print all" PDF. */
  forms: DpsmvFormKind[];
  /** Saved customer id (the buyer / owner / donee). Required. */
  customerId: string;
  /** Saved vehicle id. Required. */
  vehicleId: string;
  /** When true, a gift: produce the Act of Donation rather than the Bill of Sale. */
  gift: boolean;
  /** Other party's name: the seller (sale) or the donor (gift). */
  counterpartyName: string;
  /** Donor/donee relationship (gift only), e.g. "Parent to child". */
  relationship: string;
  /** Parish where the act is signed ("Parish of" on the BoS / AoD). */
  executionParish: string;
  /** Sale price (sale) or donated value (gift), dollars as typed. */
  amount: string;
  /** Qualifying trade-in value (dollars). Vehicle Application only. */
  tradeIn: string;
  /** Qualifying rebate (dollars). Vehicle Application only. */
  rebate: string;
  /** Trade-in vehicle VIN, if any. */
  tradeVin: string;
  /**
   * Date of sale / donation, YYYY-MM-DD. Left BLANK on the form when omitted
   * (hand-filled at the counter); never defaulted to today - only the generated
   * "Date Prepared" uses today.
   */
  date: string;
  /** Optional first lienholder, printed in the security-agreement block. */
  lienholderName: string;
  lienholderAddress: string;
  lienholderCityStateZip: string;
}

/**
 * The pure result of mapping records + fees onto ONE form's real fields.
 *   - text:   field-name -> value, for the AcroForm text fields to set.
 *   - checks: field names of checkboxes to tick.
 *   - blanks: human labels of fields deliberately left empty for staff to verify
 *             against the real form (no confident source, or signed in person).
 */
export interface FormFieldMap {
  kind: DpsmvFormKind;
  text: Record<string, string>;
  checks: string[];
  blanks: string[];
}
