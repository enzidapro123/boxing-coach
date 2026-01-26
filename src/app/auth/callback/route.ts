// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // ✅ Read params
  const error = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorDesc = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type"); // e.g., signup, recovery, magiclink...

  // ✅ Decide where to go next
  // If it's signup, ALWAYS go to login (per your requirement)
  const next =
    type === "signup"
      ? "/login?verify=1"
      : url.searchParams.get("next") ||
        url.searchParams.get("redirectedFrom") ||
        "/dashboard";

  // ✅ Handle Supabase error redirects (otp_expired, access_denied, etc.)
  // No decodeURIComponent here (can crash and cause 500)
  if (error || errorCode) {
    const msg = encodeURIComponent(
      errorDesc ||
        "This email link is invalid or has expired. Please request a new one.",
    );
    return NextResponse.redirect(
      new URL(`/check-email?error=${msg}`, url.origin),
    );
  }

  const supabase = createRouteHandlerClient({ cookies });

  // ✅ If there's a code, exchange it for session
  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) {
      // If exchange fails, send to login (no 500)
      return NextResponse.redirect(
        new URL(
          `/login?verify=0&msg=${encodeURIComponent(exErr.message)}`,
          url.origin,
        ),
      );
    }
  }

  // ✅ Get user after exchange (or if already logged in)
  const { data, error: userErr } = await supabase.auth.getUser();
  const user = data?.user;

  // For signup flows, if user isn't present, send to login anyway
  if (type === "signup" && (!user || userErr)) {
    return NextResponse.redirect(new URL("/login?verify=0", url.origin));
  }

  // For other flows, no user means login
  if (userErr || !user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  // ---- Username logic (safe) ----
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
