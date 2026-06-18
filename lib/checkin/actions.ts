"use server";

/**
 * Check-in queue server actions (mutations). These are the real trust boundary
 * — never rely on client UI for authorization.
 *
 *   - createCheckin           public (anon): join the queue, email a confirmation.
 *   - savePushSubscription    public (token-scoped RPC): attach a push subscription.
 *   - cancelCheckin           public (token-scoped RPC): leave the queue.
 *   - advanceCheckinStatus    staff only (RLS + is_staff): change status, notify.
 *
 * Customer isolation is enforced in the database: anon writes go through either
 * an INSERT constrained to a fresh 'waiting' row, or a token-scoped SECURITY
 * DEFINER function. Staff power is gated by is_staff() (reused from the dealer
 * portal). See supabase/migrations/20260618120000_checkin_queue.sql.
 */
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDealerContext } from "@/lib/dealers/dal";
import { getTransactionPath } from "@/lib/checklists";
import type { Json } from "@/lib/supabase/database.types";
import {
  sendCheckinConfirmationEmail,
  sendYoureUpEmail,
} from "@/lib/email/checkin-notifications";
import { isPushConfigured, sendPush } from "@/lib/push/webpush";
import { sanitizeReadyIds } from "./readiness";
import {
  type AdvanceStatusInput,
  type AdvanceStatusResult,
  type CheckInFormState,
  type CheckinReadiness,
  type PushSubscriptionJSON,
} from "./types";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function statusUrl(token: string): string {
  return `${siteUrl()}/check-in/status/${token}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse the optional, opt-in checklist-readiness field off the check-in form.
 * The form sends `{ serviceType, ready }` JSON only when the customer chose to
 * share. We carry it ONLY when it is for the same transaction the customer is
 * actually checking in for, and we filter the ids to that transaction's
 * checklist (the server is the trust boundary; never trust the client). Anything
 * absent, malformed, or mismatched yields null, i.e. nothing shared.
 */
function parseReadinessField(
  raw: FormDataEntryValue | null,
  serviceType: string,
): CheckinReadiness | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as { serviceType?: unknown; ready?: unknown };
  // Only carry readiness for the transaction actually being checked in for.
  if (candidate.serviceType !== serviceType) return null;
  if (!Array.isArray(candidate.ready)) return null;
  const ids = candidate.ready.filter((v): v is string => typeof v === "string");
  return { ready: sanitizeReadyIds(serviceType, ids) };
}

// ---------------------------------------------------------------------------
// Public: join the queue
// ---------------------------------------------------------------------------

export async function createCheckin(
  _prev: CheckInFormState,
  formData: FormData,
): Promise<CheckInFormState> {
  const serviceType = String(formData.get("service_type") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const path = getTransactionPath(serviceType);
  if (!path) {
    return { error: "Pick the type of visit you're here for." };
  }
  if (!name) {
    return { error: "Add your name so we can call you up." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email. It's where your status link goes." };
  }

  // Renewal capture only applies to registration renewals.
  const isRenewal = serviceType === "registration-renewal";
  const renewalDateRaw = String(formData.get("renewal_date") ?? "").trim();
  const renewalDate = isRenewal && renewalDateRaw ? renewalDateRaw : null;
  const marketingConsent =
    isRenewal && formData.get("marketing_consent") === "on";

  // Optional, opt-in checklist readiness. Only present when the customer chose
  // to share it from the /checklist tool; null (the common path) leaves the
  // insert identical to before and never touches the new column.
  const readiness = parseReadinessField(formData.get("readiness"), serviceType);

  // We generate the capability token ourselves so we can hand it back without a
  // read of the (PII-bearing) row. The DB still has a default as a backstop.
  const token = randomUUID();

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("checkins").insert({
    name,
    email,
    phone: phone || null,
    service_type: serviceType,
    session_token: token,
    renewal_date: renewalDate,
    marketing_consent: marketingConsent,
    ...(readiness ? { readiness } : {}),
  });

  if (insertError) {
    return { error: `Could not check you in: ${insertError.message}` };
  }

  // Read back ticket + position via the token-scoped function (no PII exposure
  // beyond the caller's own row).
  const { data: view } = await supabase.rpc("get_checkin", { p_token: token });
  const me = view?.[0];
  const ticketCode = me?.ticket_code ?? "";
  const position = me?.queue_position ?? 0;

  // Confirmation email — best effort (no-ops without Resend).
  await sendCheckinConfirmationEmail({
    to: email,
    name,
    ticketCode,
    serviceLabel: path.label,
    position,
    statusUrl: statusUrl(token),
  });

  return { ok: true, token, ticketCode, position };
}

// ---------------------------------------------------------------------------
// Public: token-scoped customer writes
// ---------------------------------------------------------------------------

export async function savePushSubscription(
  token: string,
  subscription: PushSubscriptionJSON,
): Promise<{ ok: boolean }> {
  if (!token) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_push_subscription", {
    p_token: token,
    p_subscription: subscription as unknown as Json,
  });
  if (error) {
    console.error(`[checkin] save_push_subscription failed: ${error.message}`);
    return { ok: false };
  }
  return { ok: data === true };
}

export async function cancelCheckin(
  token: string,
): Promise<{ ok: boolean }> {
  if (!token) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_checkin", {
    p_token: token,
  });
  if (error) {
    return { ok: false };
  }
  return { ok: data === true };
}

// ---------------------------------------------------------------------------
// Staff: advance status (and notify the customer)
// ---------------------------------------------------------------------------

export async function advanceCheckinStatus(
  input: AdvanceStatusInput,
): Promise<AdvanceStatusResult> {
  const ctx = await getDealerContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (!ctx.isStaff) {
    return { ok: false, error: "Only staff can change queue status." };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("checkins")
    .update({ status: input.status })
    .eq("id", input.id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: "Check-in not found." };

  let emailed = false;
  let pushed = false;

  // The "you're up" moment: notify the customer by email + push.
  if (updated.status === "in_progress") {
    const link = statusUrl(updated.session_token);

    if (updated.email) {
      const result = await sendYoureUpEmail({
        to: updated.email,
        name: updated.name,
        ticketCode: updated.ticket_code,
        statusUrl: link,
      });
      emailed = result.ok;
    }

    if (updated.push_subscription && isPushConfigured()) {
      const result = await sendPush(updated.push_subscription, {
        title: "You're up at 88 Title",
        body: `Ticket ${updated.ticket_code}: head to the counter.`,
        url: link,
        tag: `checkin-${updated.ticket_code}`,
      });
      pushed = result.ok;
      // Clean up a dead subscription so we don't keep trying it.
      if (result.gone) {
        await supabase
          .from("checkins")
          .update({ push_subscription: null })
          .eq("id", updated.id);
      }
    }
  }

  revalidatePath("/staff/queue");
  return { ok: true, emailed, pushed };
}
