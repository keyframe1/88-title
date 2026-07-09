import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * Session refresh + optimistic route protection for the authenticated areas
 * (the dealer portal and the staff queue console), run from the root `proxy.ts`
 * (Next 16's renamed middleware) on `/dealers/*` and `/staff/*`.
 *
 * Two jobs:
 *  1. Keep the Supabase auth session fresh. `getUser()` revalidates the token
 *     with the auth server and, when it rotates, the rewritten cookies ride back
 *     on the returned response so Server Components see a current session.
 *  2. Redirect unauthenticated visitors away from protected routes to the
 *     matching login -- /staff/login for the staff console, /dealers/login for
 *     the portal -- remembering where they were headed so sign-in bounces back.
 *
 * This is an OPTIMISTIC gate only (it makes the UX correct and fast). It is NOT
 * the security boundary: every page/action re-checks the user server-side
 * (getDealerContext + is_staff), and the database enforces isolation with RLS.
 * See the dealer-portal and check-in-queue migrations.
 */

// Routes reachable while logged OUT. The dealer auth callback must be public
// because it is what establishes the session from an email link. Both login
// pages are public so visitors can actually reach them (they live under the
// guarded /dealers and /staff trees).
const PUBLIC_PATHS = ["/dealers/login", "/dealers/auth", "/staff/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

/**
 * Which login an unauthenticated visitor belongs at. Staff routes get the staff
 * login; everything else under the guarded trees is the dealer portal, so it
 * gets the dealer login. Keeping this a path test (not an auth check) preserves
 * the optimistic, security-free nature of the proxy.
 */
function loginPathFor(pathname: string): string {
  return pathname === "/staff" || pathname.startsWith("/staff/")
    ? "/staff/login"
    : "/dealers/login";
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // The public dealer pitch page moved to /for-dealers. Permanently (301)
  // redirect the old bare /dealers to it, for everyone (a signed-in dealer sees
  // the pitch too, not a bounce). Matched EXACTLY, so the guarded portal beneath
  // it (/dealers/login, /dealers/dashboard, /dealers/auth/*) is never caught.
  // Runs before any session work: a pure redirect needs no Supabase call.
  if (pathname === "/dealers") {
    const pitchUrl = request.nextUrl.clone();
    pitchUrl.pathname = "/for-dealers";
    pitchUrl.search = "";
    return NextResponse.redirect(pitchUrl, 301);
  }

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

  const isPublic = isPublicPath(pathname);

  // Unauthenticated + protected route -> send to the matching login (staff vs
  // dealer), remembering where they were headed so we can bounce back after
  // sign-in.
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    // Preserve the FULL destination (path + query) so a deep link from a
    // notification email — e.g. /dealers/dashboard?deal=<id> — survives the login
    // bounce. `nextUrl.search` includes the leading "?" (or is empty). The
    // sign-in action re-validates this before redirecting (no open redirects).
    const destination = `${pathname}${request.nextUrl.search}`;
    loginUrl.pathname = loginPathFor(pathname);
    loginUrl.search = "";
    loginUrl.searchParams.set("redirectedFrom", destination);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting the dealer login -> straight to their dashboard.
  // (Bare /dealers is handled above; the pitch itself lives at /for-dealers, which
  // is outside this proxy's matcher, so a signed-in dealer can read it freely.)
  if (user && pathname === "/dealers/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dealers/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }
  if (user && pathname === "/staff/login") {
    const queueUrl = request.nextUrl.clone();
    queueUrl.pathname = "/staff/queue";
    queueUrl.search = "";
    return NextResponse.redirect(queueUrl);
  }

  return response;
}
