import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * Session refresh + optimistic route protection for the dealer portal, run from
 * the root `proxy.ts` (Next 16's renamed middleware) on `/dealers/*`.
 *
 * Two jobs:
 *  1. Keep the Supabase auth session fresh. `getUser()` revalidates the token
 *     with the auth server and, when it rotates, the rewritten cookies ride back
 *     on the returned response so Server Components see a current session.
 *  2. Redirect unauthenticated visitors away from protected dealer routes.
 *
 * This is an OPTIMISTIC gate only (it makes the UX correct and fast). It is NOT
 * the security boundary: every page/action re-checks the user server-side via
 * requireDealer(), and the database enforces data isolation with RLS. See
 * supabase/migrations/20260617120000_dealer_portal.sql.
 */

// Routes under /dealers reachable while logged OUT. The auth callback must be
// public because it is what establishes the session from an email link.
const PUBLIC_DEALER_PATHS = ["/dealers/login", "/dealers/auth"];

function isPublicDealerPath(pathname: string): boolean {
  return PUBLIC_DEALER_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env is missing this is a deployment misconfiguration. Don't crash the
  // request here — fall through so the page-level client surfaces a clear error.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: do not run logic between client creation and getUser(); it must
  // run so the session can refresh (per Supabase SSR guidance).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = isPublicDealerPath(pathname);

  // Unauthenticated + protected route -> send to login, remembering where they
  // were headed so we can bounce back after sign-in.
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/dealers/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting the login page -> straight to the dashboard.
  if (user && pathname === "/dealers/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dealers";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
