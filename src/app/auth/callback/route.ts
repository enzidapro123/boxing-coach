// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // ✅ Handle Supabase error redirects (otp_expired, access_denied, etc.)
  const error = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorDesc = url.searchParams.get("error_description");

  if (error || errorCode) {
    // Send them to check-email page so they can resend
    const msg = encodeURIComponent(
      decodeURIComponent(
        errorDesc ||
          "This email link is invalid or has expired. Please request a new one.",
      ),
    );
    return NextResponse.redirect(
      new URL(`/check-email?error=${msg}`, url.origin),
    );
  }

  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next") ||
    url.searchParams.get("redirectedFrom") ||
    "/dashboard";

  const supabase = createRouteHandlerClient({ cookies });

  // ✅ If there's a code, exchange it for session
  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) {
      // If exchange fails, send to login (no 500)
      return NextResponse.redirect(
        new URL("/login?error=verify_failed", url.origin),
      );
    }
  }

  // ✅ Get user after exchange (or if already logged in)
  const { data, error: userErr } = await supabase.auth.getUser();
  const user = data?.user;

  if (userErr || !user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  // ---- Your existing username logic (runs only when user exists) ----
  const desired = String(user.user_metadata?.desired_username ?? "").trim();
  if (desired.length >= 3 && /^[a-zA-Z0-9._]+$/.test(desired)) {
    const { data: me } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (!me?.username) {
      const { data: taken } = await supabase
        .from("users")
        .select("id")
        .ilike("username", desired)
        .maybeSingle();

      if (!taken || taken.id === user.id) {
        await supabase
          .from("users")
          .update({ username: desired })
          .eq("id", user.id);
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
