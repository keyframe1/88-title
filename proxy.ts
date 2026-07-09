import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 Proxy (the renamed `middleware`). Scoped to the authenticated areas:
 * the dealer portal and the staff queue console. It refreshes the Supabase
 * session and redirects unauthenticated users to the login. It also 301s the old
 * bare `/dealers` to the relocated public pitch page at `/for-dealers`. The
 * public marketing site (including `/for-dealers`) and the public check-in queue
 * are otherwise untouched.
 *
 * This is an optimistic check only — real enforcement is server-side
 * (getDealerContext + is_staff) plus database RLS.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on the dealer portal and the staff console (and everything beneath).
  // Bare `/dealers` stays matched so the 301 to `/for-dealers` fires; the pitch
  // page itself (`/for-dealers`) is deliberately NOT matched.
  matcher: ["/dealers", "/dealers/:path*", "/staff", "/staff/:path*"],
};
