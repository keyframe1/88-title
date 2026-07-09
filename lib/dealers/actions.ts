"use server";

/**
 * Dealer portal server actions (mutations). Every action is server-side, so it
 * is the real trust boundary — never rely on client UI for authorization.
 *
 * Auth actions (signIn / requestPasswordReset / updatePassword / signOut) use
 * Supabase Auth. Data actions (createTransaction / updateTransactionStatus)
 * re-resolve identity via the DAL and lean on RLS for isolation.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDealerContext } from "./dal";
import { sendDealerNotification } from "@/lib/email/dealer-notifications";
import { logActivity } from "@/lib/activity/log";
import {
  describeVehicle,
  TRANSACTION_STATUS_META,
  TRANSACTION_STATUSES,
  type AuthFormState,
  type DealerTransaction,
  type TransactionFormState,
  type UndoStatusInput,
  type UpdateAttentionInput,
  type UpdateStatusInput,
  type UpdateStatusResult,
} from "./types";

/** Keep post-login redirects inside our authenticated areas (no open redirects). */
function safeDealerRedirect(target: string): string {
  // Bare /dealers 301s to the public pitch (/for-dealers), so a signed-in dealer
  // returning from login belongs on their dashboard instead. Everything else
  // valid under our authenticated areas is preserved.
  if (target === "/dealers") return "/dealers/dashboard";
  if (
    !target.startsWith("//") &&
    (target.startsWith("/dealers") || target.startsWith("/staff")) &&
    !target.startsWith("/dealers/login") &&
    !target.startsWith("/dealers/auth")
  ) {
    return target;
  }
  return "/dealers/dashboard";
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Deliberately vague — don't reveal whether the email exists.
    return {
      error:
        "Those credentials didn't match. Check your email and password and try again.",
    };
  }

  redirect(safeDealerRedirect(String(formData.get("redirectedFrom") ?? "")));
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email to reset your password." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/dealers/auth/callback?next=/dealers/update-password`,
  });

  // Always report success — never disclose whether an account exists.
  return {
    message: "If that email is on file, a password reset link is on its way.",
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { error: "Use at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Those passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Your reset link has expired. Request a new one from the login page.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/dealers/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/dealers/login");
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function createTransaction(
  _prev: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const ctx = await getDealerContext();
  if (!ctx) {
    return { error: "Your session expired. Please sign in again." };
  }
  if (!ctx.dealer) {
    return { error: "Your account isn't linked to a dealership yet." };
  }

  const stock = String(formData.get("stock_number") ?? "").trim();
  const vin = String(formData.get("vin") ?? "")
    .trim()
    .toUpperCase();
  const vehicle = String(formData.get("vehicle_description") ?? "").trim();
  const type = String(formData.get("transaction_type") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  // Decoded fields ride along as hidden inputs the client set after an NHTSA
  // decode. Parse the year defensively (a blank or junk value becomes null).
  const yearRaw = String(formData.get("vehicle_year") ?? "").trim();
  const yearNum = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
  const make = String(formData.get("vehicle_make") ?? "").trim();
  const model = String(formData.get("vehicle_model") ?? "").trim();

  // Need at least one way to recognize the deal.
  if (!stock && !vin && !vehicle && !type) {
    return {
      error: "Add a stock number, VIN, vehicle, or transaction type.",
    };
  }

  const supabase = await createClient();
  // RLS WITH CHECK re-verifies dealer_id = current_dealer_id(); we set it from
  // the authenticated context so a dealer can only ever file under themselves.
  // The BEFORE INSERT guard (migration 20260629) forces status='submitted' and
  // clears any attention fields for a dealer insert, so those are staff-gated.
  const { data: filed, error } = await supabase
    .from("dealer_transactions")
    .insert({
      dealer_id: ctx.dealer.id,
      stock_number: stock || null,
      vin: vin || null,
      vehicle_year: yearNum,
      vehicle_make: make || null,
      vehicle_model: model || null,
      vehicle_description: vehicle || null,
      transaction_type: type || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Could not file the transaction: ${error.message}` };
  }

  // Record the ONE dealer-originated activity_log event (dealer_tx.filed). The
  // request-scoped client cannot INSERT into activity_log (its policy is staff-
  // only), so this goes through the self-scoped SECURITY DEFINER function from
  // migration 20260630, which forces actor=auth.uid() and verifies the row is
  // this dealer's own. Best effort: the audit line must never block filing.
  const { error: logError } = await supabase.rpc("log_dealer_tx_filed", {
    p_transaction_id: filed.id,
  });
  if (logError) {
    console.error(`[activity] could not log dealer_tx.filed: ${logError.message}`);
  }

  revalidatePath("/dealers/dashboard");
  revalidatePath("/staff/dealers");
  return { success: true };
}

/**
 * Staff-only: advance (or jump) a transaction's status and notify the dealer
 * when it reaches "ready_for_pickup" — the "come get it" moment. Enforced by RLS
 * (UPDATE on dealer_transactions is is_staff() only); the isStaff guard here is
 * defense in depth. Returns the updated row so the console reflects it at once.
 */
export async function updateTransactionStatus(
  input: UpdateStatusInput,
): Promise<UpdateStatusResult> {
  const ctx = await getDealerContext();
  if (!ctx) {
    return { ok: false, error: "Not authenticated." };
  }
  if (!ctx.isStaff) {
    return { ok: false, error: "Only staff can change a transaction's status." };
  }
  if (!TRANSACTION_STATUSES.includes(input.status)) {
    return { ok: false, error: "Unknown status." };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("dealer_transactions")
    .update({
      status: input.status,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", input.transactionId)
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!updated) {
    return { ok: false, error: "Transaction not found." };
  }

  // The pickup signal is the one the dealer is waiting on.
  let emailed = false;
  if (updated.status === "ready_for_pickup") {
    const { data: dealer } = await supabase
      .from("dealers")
      .select("*")
      .eq("id", updated.dealer_id)
      .maybeSingle();
    if (dealer) {
      const result = await sendDealerNotification({
        dealer,
        transaction: updated,
        kind: "ready",
      });
      emailed = result.ok;
    }
  }

  const statusLabel = TRANSACTION_STATUS_META[updated.status].label;
  await logActivity(supabase, {
    actor: ctx.user.id,
    action: "dealer_transaction.status_change",
    entityType: "dealer_transaction",
    entityId: updated.id,
    summary: `Set ${transactionLabel(updated)} to “${statusLabel}”`,
    detail: {
      status: updated.status,
      stockNumber: updated.stock_number,
      vehicle: describeVehicle(updated),
      transactionType: updated.transaction_type,
    },
  });

  revalidatePath("/dealers/dashboard");
  revalidatePath("/staff/dealers");
  return { ok: true, emailed, transaction: updated };
}

/**
 * Staff-only: revert a transaction to a prior status (the inverse of a status
 * advance, wired to the console's Undo toast). It is a genuine inverse through the
 * same staff-gated UPDATE path, logged as its OWN event (dealer_transaction.
 * undo_status_change) so the trail is honest, and it deliberately does NOT re-fire
 * the dealer "ready for pickup" email - an undo should never notify. Returns the
 * reverted row so the console reflects it at once.
 */
export async function undoTransactionStatus(
  input: UndoStatusInput,
): Promise<UpdateStatusResult> {
  const ctx = await getDealerContext();
  if (!ctx) {
    return { ok: false, error: "Not authenticated." };
  }
  if (!ctx.isStaff) {
    return { ok: false, error: "Only staff can change a transaction's status." };
  }
  if (!TRANSACTION_STATUSES.includes(input.previousStatus)) {
    return { ok: false, error: "Unknown status." };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("dealer_transactions")
    .update({
      status: input.previousStatus,
      status_updated_at: new Date().toISOString(),
    })
    .eq("id", input.transactionId)
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!updated) {
    return { ok: false, error: "Transaction not found." };
  }

  const statusLabel = TRANSACTION_STATUS_META[updated.status].label;
  await logActivity(supabase, {
    actor: ctx.user.id,
    action: "dealer_transaction.undo_status_change",
    entityType: "dealer_transaction",
    entityId: updated.id,
    summary: `Reverted ${transactionLabel(updated)} to “${statusLabel}” (undo)`,
    detail: {
      status: updated.status,
      stockNumber: updated.stock_number,
      vehicle: describeVehicle(updated),
      transactionType: updated.transaction_type,
    },
  });

  revalidatePath("/dealers/dashboard");
  revalidatePath("/staff/dealers");
  return { ok: true, emailed: false, transaction: updated };
}

/**
 * Staff-only: raise or clear the "needs attention" flag (the title clerk's
 * problem-title state) and, when raising it, notify the dealer with the note.
 * Orthogonal to status, so the transaction keeps its pipeline position. Same RLS
 * gate (staff-only UPDATE) plus the isStaff guard here.
 */
export async function updateTransactionAttention(
  input: UpdateAttentionInput,
): Promise<UpdateStatusResult> {
  const ctx = await getDealerContext();
  if (!ctx) {
    return { ok: false, error: "Not authenticated." };
  }
  if (!ctx.isStaff) {
    return { ok: false, error: "Only staff can flag a transaction." };
  }

  const note = input.needsAttention
    ? (input.attentionNote ?? "").trim() || null
    : null;

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("dealer_transactions")
    .update({
      needs_attention: input.needsAttention,
      attention_note: note,
    })
    .eq("id", input.transactionId)
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!updated) {
    return { ok: false, error: "Transaction not found." };
  }

  // Only a freshly-raised flag warrants a heads-up email; clearing it is silent.
  let emailed = false;
  if (input.needsAttention) {
    const { data: dealer } = await supabase
      .from("dealers")
      .select("*")
      .eq("id", updated.dealer_id)
      .maybeSingle();
    if (dealer) {
      const result = await sendDealerNotification({
        dealer,
        transaction: updated,
        kind: "attention",
      });
      emailed = result.ok;
    }
  }

  await logActivity(supabase, {
    actor: ctx.user.id,
    action: "dealer_transaction.attention_change",
    entityType: "dealer_transaction",
    entityId: updated.id,
    summary: input.needsAttention
      ? `Flagged ${transactionLabel(updated)} for attention`
      : `Cleared the attention flag on ${transactionLabel(updated)}`,
    detail: {
      needsAttention: updated.needs_attention,
      attentionNote: updated.attention_note,
      stockNumber: updated.stock_number,
      vehicle: describeVehicle(updated),
    },
  });

  revalidatePath("/dealers/dashboard");
  revalidatePath("/staff/dealers");
  return { ok: true, emailed, transaction: updated };
}

/** A short, human label for a transaction in activity summaries. */
function transactionLabel(tx: DealerTransaction): string {
  const stock = tx.stock_number?.trim();
  const vehicle = describeVehicle(tx);
  if (stock) return `stock #${stock} (${vehicle})`;
  return vehicle;
}
