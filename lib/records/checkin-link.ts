/**
 * Server-only helper (NOT a "use server" action module): connect a check-in to
 * the customer/vehicle a transaction selected, and carry the check-in's renewal
 * capture forward onto the customer profile.
 *
 * This is the Change-1 seam. When a transaction that originated from a check-in
 * (the "Start transaction" handoff carries ?checkin=<id>) is recorded with a
 * selected/created customer, we:
 *   1. write checkins.customer_id (+ vehicle_id) so the check-in's renewal capture
 *      is finally attached to a record; and
 *   2. copy that check-in's renewal_date + marketing_consent onto the customer's
 *      profile, but ONLY when the customer has none yet (never clobber a value a
 *      clerk set, or a newer one already copied forward).
 *
 * Best-effort throughout: the transaction that triggered this has already been
 * recorded, so a failure here must never surface as a transaction error. Staff
 * identity is enforced by the caller (recordTransaction) and by RLS.
 *
 * See supabase/migrations/20260701120000_customer_graph.sql.
 */
import { createClient } from "@/lib/supabase/server";

export async function linkCheckinToRecords(input: {
  checkinId: string;
  customerId: string | null;
  vehicleId: string | null;
}): Promise<void> {
  const { checkinId, customerId, vehicleId } = input;
  if (!checkinId) return;
  try {
    const supabase = await createClient();

    // 1. Attach the record link(s). Only the ones provided are written - a
    //    transaction with no customer selected never clears an existing link.
    const patch: { customer_id?: string; vehicle_id?: string } = {};
    if (customerId) patch.customer_id = customerId;
    if (vehicleId) patch.vehicle_id = vehicleId;
    if (Object.keys(patch).length === 0) return;
    await supabase.from("checkins").update(patch).eq("id", checkinId);

    // 2. Copy the renewal capture forward onto the customer profile, but only
    //    when the profile is still empty (the .is("renewal_date", null) guard),
    //    so a set value is never overwritten.
    if (customerId) {
      const { data: checkin } = await supabase
        .from("checkins")
        .select("renewal_date, marketing_consent")
        .eq("id", checkinId)
        .maybeSingle();
      if (checkin?.renewal_date) {
        await supabase
          .from("customers")
          .update({
            renewal_date: checkin.renewal_date,
            marketing_consent: checkin.marketing_consent,
          })
          .eq("id", customerId)
          .is("renewal_date", null);
      }
    }
  } catch {
    // Best effort: the transaction already succeeded; this is a follow-on link.
  }
}
