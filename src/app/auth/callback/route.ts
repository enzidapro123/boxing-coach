import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  try {
    // If Supabase sends an error (expired link, access denied, etc.)
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
      // No code? just go login
      return NextResponse.redirect(new URL("/login", url.origin));
    }

    const supabase = createRouteHandlerClient({ cookies });

    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) {
      const msg = encodeURIComponent(exErr.message);
      return NextResponse.redirect(
        new URL(`/check-email?error=${msg}`, url.origin),
      );
    }

    // ✅ SUCCESS: ALWAYS GO TO LOGIN
    return NextResponse.redirect(new URL("/login", url.origin));
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
