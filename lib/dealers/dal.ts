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
  return (txns ?? []).map((tx) => {
    const dealer = byId.get(tx.dealer_id);
    return {
      ...tx,
      dealershipName: dealer?.dealership_name ?? "Unknown dealership",
      dealerEmail: dealer?.contact_email ?? null,
      dealerPhone: dealer?.phone ?? null,
    };
  });
}
