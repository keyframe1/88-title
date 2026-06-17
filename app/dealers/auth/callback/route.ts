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

  const requestedNext = searchParams.get("next") ?? "/dealers";
  const next = requestedNext.startsWith("/dealers")
    ? requestedNext
    : "/dealers";

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
