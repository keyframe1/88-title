"use server";

/**
 * Transactions server actions (mutations + the ledger read the client date
 * picker uses). Server-side is the real trust boundary: every action re-resolves
 * identity via the DAL and refuses a non-staff caller, on top of the database's
 * is_staff() RLS. See supabase/migrations/20260625120000_transactions.sql.
 *
 *   - recordTransaction   staff: capture a completed transaction from the fee
 *                          calculator or the forms page. The money is RE-COMPUTED
 *                          server-side from the itemized input (never a client
 *                          total) and FROZEN on the row - the audit snapshot.
 *   - voidTransaction     staff: void a transaction with a reason (excluded from
 *                          totals; struck through on the report).
 *   - getTransactionsForDayAction  staff: one business-day's ledger rows.
 *
 * processed_by is ALWAYS the session user (ctx.user.id) - never client-supplied.
 */
import { createClient } from "@/lib/supabase/server";
import { getDealerContext } from "@/lib/dealers/dal";
import { calculateFees, formatCents } from "@/lib/tax/rates";
import type { ResolvedRate } from "@/lib/tax/types";
import { getTransactionPath } from "@/lib/checklists";
import { logActivity } from "@/lib/activity/log";
import { linkCheckinToRecords } from "@/lib/records/checkin-link";
import { getTransactionsForDay } from "./dal";
import { shortId } from "./format";
import type {
  LedgerRow,
  RecordTransactionInput,
  RecordTransactionResult,
  TransactionMutationResult,
} from "./types";

/**
 * Capture a completed transaction. The money fields are recomputed from the
 * itemized input via the same fee engine the calculator uses (defensive: a
 * corrupted client total can never be stored), then frozen. The statutory $23
 * tag fee lands in its own discrete column, never merged.
 */
export async function recordTransaction(
  input: RecordTransactionInput,
): Promise<RecordTransactionResult> {
  const ctx = await getDealerContext();
  if (!ctx) return { ok: false, error: "Your session expired. Please sign in again." };
  if (!ctx.isStaff) {
    return { ok: false, error: "Only staff can record a transaction." };
  }

  const serviceType = input.serviceType.trim();
  if (!serviceType) {
    return { ok: false, error: "Pick a service type for this transaction." };
  }

  // ResolvedRate carries a `note`; the itemized AppliedRate does not. The tax
  // math only reads level/name/ratePercent, so fill note as null.
  const appliedRates: ResolvedRate[] = input.appliedRates.map((rate) => ({
    level: rate.level,
    name: rate.name,
    ratePercent: rate.ratePercent,
    note: null,
  }));

  const breakdown = calculateFees({
    sellingPriceCents: input.salePriceCents,
    tradeInCents: input.tradeInCents,
    rebateCents: input.rebateCents,
    appliedRates,
    serviceFees: input.serviceFees.map((fee) => ({
      id: fee.id,
      label: fee.label,
      amountCents: fee.amountCents,
    })),
  });

  const notes = input.notes?.trim() || null;
  const nowIso = new Date().toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      processed_by: ctx.user.id,
      customer_id: input.customerId ?? null,
      vehicle_id: input.vehicleId ?? null,
      checkin_id: input.checkinId ?? null,
      service_type: serviceType,
      status: "completed",
      sale_price_cents: breakdown.sellingPriceCents,
      trade_in_cents: breakdown.tradeInCents,
      rebate_cents: breakdown.rebateCents,
      taxable_amount_cents: breakdown.taxableCents,
      tax_cents: breakdown.totalTaxCents,
      parish: input.parish?.trim() || null,
      service_fees: breakdown.serviceFeeLines.map((fee) => ({
        id: fee.id,
        label: fee.label,
        amountCents: fee.amountCents,
      })),
      service_fee_total_cents: breakdown.serviceFeesTotalCents,
      statutory_tag_fee_cents: breakdown.publicTagFeeCents,
      total_collected_cents: breakdown.totalCents,
      notes,
      completed_at: nowIso,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: `Could not record the transaction: ${error.message}` };
  }

  const label = getTransactionPath(serviceType)?.label ?? serviceType;
  await logActivity(supabase, {
    actor: ctx.user.id,
    action: "transaction.record",
    entityType: "transaction",
    entityId: data.id,
    summary: `Recorded ${label} — ${formatCents(breakdown.totalCents)}`,
    detail: {
      shortId: shortId(data.id),
      serviceType,
      totalCollectedCents: breakdown.totalCents,
    },
  });

  // Change 1: a transaction that originated from a check-in connects that
  // check-in to the selected customer/vehicle and carries its renewal capture
  // onto the customer profile. Best-effort - never blocks the recorded row.
  if (input.checkinId) {
    await linkCheckinToRecords({
      checkinId: input.checkinId,
      customerId: input.customerId ?? null,
      vehicleId: input.vehicleId ?? null,
    });
  }

  return { ok: true, id: data.id, shortId: shortId(data.id) };
}

/**
 * Void a transaction with a reason. Voided rows are excluded from day totals and
 * struck through on the report. No-op (error) if it is already voided.
 */
export async function voidTransaction(
  id: string,
  reason: string,
): Promise<TransactionMutationResult> {
  const ctx = await getDealerContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (!ctx.isStaff) {
    return { ok: false, error: "Only staff can void a transaction." };
  }
  if (!id) return { ok: false, error: "Missing the transaction to void." };
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "Enter a reason for the void." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
      void_reason: trimmed,
    })
    .eq("id", id)
    .neq("status", "voided")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: `Could not void the transaction: ${error.message}` };
  if (!data) return { ok: false, error: "That transaction was not found or is already voided." };

  await logActivity(supabase, {
    actor: ctx.user.id,
    action: "transaction.void",
    entityType: "transaction",
    entityId: id,
    summary: `Voided transaction ${shortId(id)}: ${trimmed}`,
    detail: { shortId: shortId(id), reason: trimmed },
  });

  return { ok: true };
}

/** One business-day's ledger rows for the client date picker. [] for non-staff. */
export async function getTransactionsForDayAction(
  day: string,
): Promise<LedgerRow[]> {
  const ctx = await getDealerContext();
  if (!ctx || !ctx.isStaff) return [];
  try {
    return await getTransactionsForDay(day);
  } catch {
    return [];
  }
}
