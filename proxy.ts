import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 Proxy (the renamed `middleware`). Scoped to the authenticated areas:
 * the dealer portal and the staff queue console. It refreshes the Supabase
 * session and redirects unauthenticated users to the login. The public
 * marketing site and the public check-in queue are untouched.
 *
 * This is an optimistic check only — real enforcement is server-side
 * (getDealerContext + is_staff) plus database RLS.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on the dealer portal and the staff console (and everything beneath).
  matcher: ["/dealers", "/dealers/:path*", "/staff", "/staff/:path*"],
};
