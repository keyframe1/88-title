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
import { sendTransactionStatusEmail } from "@/lib/email/dealer-notifications";
import { logActivity } from "@/lib/activity/log";
import {
  TRANSACTION_STATUS_META,
  type AuthFormState,
  type TransactionFormState,
  type UpdateStatusInput,
  type UpdateStatusResult,
} from "./types";

/** Keep post-login redirects inside our authenticated areas (no open redirects). */
function safeDealerRedirect(target: string): string {
  // Bare /dealers is now the PUBLIC pitch page, so a signed-in dealer belongs on
  // their dashboard instead. Everything else valid under our areas is preserved.
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

  const vehicle = String(formData.get("vehicle_description") ?? "").trim();
  const type = String(formData.get("transaction_type") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!vehicle && !type) {
    return {
      error: "Add at least a vehicle description or a transaction type.",
    };
  }

  const supabase = await createClient();
  // RLS WITH CHECK re-verifies dealer_id = current_dealer_id(); we set it from
  // the authenticated context so a dealer can only ever file under themselves.
  const { error } = await supabase.from("dealer_transactions").insert({
    dealer_id: ctx.dealer.id,
    vehicle_description: vehicle || null,
    transaction_type: type || null,
    notes: notes || null,
  });

  if (error) {
    return { error: `Could not file the transaction: ${error.message}` };
  }

  revalidatePath("/dealers/dashboard");
  return { success: true };
}

/**
 * Staff-only: change a transaction's status and notify the dealer when it moves
 * to "ready" or "docs_needed". Wired and enforced now (RLS limits UPDATE to
 * staff); the staff UI that calls it lands in a later phase.
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

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("dealer_transactions")
    .update({
      status: input.status,
      docs_needed_note:
        input.status === "docs_needed" ? (input.docsNeededNote ?? null) : null,
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

  let emailed = false;
  if (updated.status === "ready" || updated.status === "docs_needed") {
    const { data: dealer } = await supabase
      .from("dealers")
      .select("*")
      .eq("id", updated.dealer_id)
      .maybeSingle();
    if (dealer) {
      const result = await sendTransactionStatusEmail({
        dealer,
        transaction: updated,
      });
      emailed = result.ok;
    }
  }

  const statusLabel = TRANSACTION_STATUS_META[updated.status].label;
  const what =
    updated.vehicle_description?.trim() ||
    updated.transaction_type?.trim() ||
    "dealer transaction";
  await logActivity(supabase, {
    actor: ctx.user.id,
    action: "dealer_transaction.status_change",
    entityType: "dealer_transaction",
    entityId: updated.id,
    summary: `Set ${what} to “${statusLabel}”`,
    detail: {
      status: updated.status,
      vehicleDescription: updated.vehicle_description,
      transactionType: updated.transaction_type,
      docsNeededNote: updated.docs_needed_note,
    },
  });

  revalidatePath("/dealers/dashboard");
  return { ok: true, emailed };
}
