/**
 * Dealer portal Data Access Layer (server-only).
 *
 * Every protected page/action resolves identity through here rather than
 * trusting the proxy. getDealerContext() calls supabase.auth.getUser(), which
 * revalidates the JWT with the auth server (unlike getSession(), which only
 * reads the cookie) — this is the authoritative auth check. Wrapped in React's
 * cache() so repeated calls within one request hit Supabase once.
 *
 * Data isolation itself is enforced by RLS in the database; the queries below
 * are already scoped to the caller, but we still pass explicit filters for
 * clarity and to use the indexes.
 */
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Dealer, DealerTransaction } from "./types";

export interface DealerContext {
  /** The authenticated Supabase auth user. */
  user: User;
  /** The dealer record linked to this user, or null if the login isn't linked. */
  dealer: Dealer | null;
  /** True when this user is staff/admin (sees all dealers and transactions). */
  isStaff: boolean;
}

/**
 * Resolve the current request's identity, or null when not signed in.
 * Memoized per request render pass.
 */
export const getDealerContext = cache(
  async (): Promise<DealerContext | null> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // RLS lets a dealer read only their own row; this returns it (or null for a
    // logged-in non-dealer such as a staff member or an unlinked login).
    const { data: dealer } = await supabase
      .from("dealers")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // RLS on staff_users is `using (is_staff())`, so a non-staff user sees no
    // rows here at all; presence of the row is itself the staff signal.
    const { data: staffRow } = await supabase
      .from("staff_users")
      .select("auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    return {
      user,
      dealer: dealer ?? null,
      isStaff: staffRow !== null,
    };
  },
);

/**
 * Transactions for one dealer, newest first. RLS guarantees a dealer can only
 * ever read their own rows; the explicit dealer_id filter keeps intent obvious
 * and uses the (dealer_id, created_at desc) index.
 */
export async function listDealerTransactions(
  dealerId: string,
): Promise<DealerTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dealer_transactions")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }
  return data ?? [];
}

/** A dealer transaction plus the dealership name/contact, for the staff console. */
export interface StaffDealerTransaction extends DealerTransaction {
  dealershipName: string;
  dealerEmail: string | null;
  dealerPhone: string | null;
  /**
   * When the attention flag was last raised/updated, and by whom (resolved staff
   * display name) — read from the activity log so the panel can show "Flagged
   * {date} by {name}". Null when the deal isn't flagged or the audit row is
   * unavailable; attribution is decorative and never blocks the list.
   */
  flaggedAt: string | null;
  flaggedByName: string | null;
}

/** Resolve a batch of actor auth ids -> staff display names (never a UUID). */
async function resolveStaffNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.rpc("staff_display_names", {
    p_ids: ids,
  });
  if (error) return map;
  for (const row of data ?? []) {
    map.set(row.auth_user_id, row.display_name);
  }
  return map;
}

/** When/by-whom the attention flag was last raised, per transaction id. */
interface FlagAttribution {
  at: string;
  by: string;
}

/**
 * For each flagged transaction, find the most recent attention-RAISE event in the
 * activity log (action "dealer_transaction.attention_change" with the flag set on)
 * and resolve its actor to a staff display name. Best-effort throughout: any
 * failure (e.g. the log unavailable) yields an empty map, and the caller simply
 * shows no attribution. A single query plus one name-resolution round-trip.
 */
async function getFlagAttribution(
  supabase: Awaited<ReturnType<typeof createClient>>,
  transactionIds: string[],
): Promise<Map<string, FlagAttribution>> {
  const map = new Map<string, FlagAttribution>();
  if (transactionIds.length === 0) return map;
  try {
    const { data, error } = await supabase
      .from("activity_log")
      .select("actor, entity_id, detail, created_at")
      .eq("entity_type", "dealer_transaction")
      .eq("action", "dealer_transaction.attention_change")
      .in("entity_id", transactionIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (error || !data) return map;

    // Rows are newest-first; the first RAISE per transaction is the current flag.
    const latest = new Map<string, { actor: string; at: string }>();
    const actorIds = new Set<string>();
    for (const row of data) {
      const id = row.entity_id;
      if (!id || latest.has(id)) continue;
      const detail = row.detail as { needsAttention?: unknown } | null;
      if (detail?.needsAttention !== true) continue;
      latest.set(id, { actor: row.actor, at: row.created_at });
      actorIds.add(row.actor);
    }

    const names = await resolveStaffNames(supabase, [...actorIds]);
    for (const [id, info] of latest) {
      map.set(id, { at: info.at, by: names.get(info.actor) ?? "Staff" });
    }
  } catch {
    // Attribution is decorative; never let it break the board.
  }
  return map;
}

/**
 * Every dealer's transactions, newest first, each tagged with its dealership.
 * Staff-only in practice: RLS returns all rows to a staff caller and none to a
 * dealer (their SELECT is scoped to their own dealer_id), so a dealer who
 * somehow reached this would simply see only their own work. The dealer lookup
 * is resolved in memory (a couple of dealerships), avoiding a typed embed.
 */
export async function listAllDealerTransactions(): Promise<
  StaffDealerTransaction[]
> {
  const supabase = await createClient();

  const [{ data: txns, error: txnErr }, { data: dealers, error: dealerErr }] =
    await Promise.all([
      supabase
        .from("dealer_transactions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("dealers").select("*"),
    ]);

  if (txnErr) {
    throw new Error(`Failed to load dealer transactions: ${txnErr.message}`);
  }
  if (dealerErr) {
    throw new Error(`Failed to load dealers: ${dealerErr.message}`);
  }

  const byId = new Map((dealers ?? []).map((d) => [d.id, d]));

  // Attribution only for the flagged subset (usually a handful), best-effort.
  const flaggedIds = (txns ?? [])
    .filter((tx) => tx.needs_attention)
    .map((tx) => tx.id);
  const attribution = await getFlagAttribution(supabase, flaggedIds);

  return (txns ?? []).map((tx) => {
    const dealer = byId.get(tx.dealer_id);
    const flag = attribution.get(tx.id);
    return {
      ...tx,
      dealershipName: dealer?.dealership_name ?? "Unknown dealership",
      dealerEmail: dealer?.contact_email ?? null,
      dealerPhone: dealer?.phone ?? null,
      flaggedAt: flag?.at ?? null,
      flaggedByName: flag?.by ?? null,
    };
  });
}
