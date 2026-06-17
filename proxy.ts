import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 Proxy (the renamed `middleware`). Scoped to the dealer portal: it
 * refreshes the Supabase session and redirects unauthenticated users to the
 * dealer login. The public marketing site is untouched.
 *
 * This is an optimistic check only — real enforcement is server-side
 * (requireDealer) plus database RLS.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on the dealer portal (the bare /dealers route and everything beneath).
  matcher: ["/dealers", "/dealers/:path*"],
};
