import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback for email links (password reset / invite). Supabase redirects
 * here with either a PKCE `code` or a `token_hash` + `type`; we establish the
 * session from whichever is present, then forward to `next` (kept inside the
 * portal). On failure we bounce to the login page with an error flag.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Default and fallback land on the dashboard. Bare /dealers now 301s to the
  // public pitch (/for-dealers), so a freshly-authed user is sent to the
  // dashboard instead. `next` must stay inside the portal tree (no open redirects).
  const requestedNext = searchParams.get("next") ?? "/dealers/dashboard";
  const next =
    requestedNext !== "/dealers" && requestedNext.startsWith("/dealers")
      ? requestedNext
      : "/dealers/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/dealers/login?error=auth`);
}
