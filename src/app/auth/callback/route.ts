import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Supabase email confirmation / magic links land here as:
 *   /auth/callback?code=XXXX
 *
 * IMPORTANT:
 * We DO NOT exchange the code here (server cookies) because your app auth
 * uses browser storage (local/session). Exchanging on server causes
 * login/dashboard redirect "blinking".
 *
 * Instead, we forward the code to /login where the browser client exchanges it.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  try {
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");
    if (error) {
      const msg = encodeURIComponent(
        errorDesc || "Email link is invalid or has expired",
      );
      return NextResponse.redirect(
        new URL(`/check-email?error=${msg}`, url.origin),
      );
    }

    const code = url.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(new URL("/login", url.origin));
    }

    // forward to login so the browser client can exchangeCodeForSession(code)
    const next = url.searchParams.get("next") || "/dashboard";
    return NextResponse.redirect(
      new URL(
        `/login?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
        url.origin,
      ),
    );
  } catch (e) {
    console.error("AUTH CALLBACK CRASH:", e);
    const msg = encodeURIComponent(
      "Callback failed. Please resend a new verification link.",
    );
    return NextResponse.redirect(
      new URL(`/check-email?error=${msg}`, url.origin),
    );
  }
}
