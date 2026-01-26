// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  try {
    // handle Supabase errors (expired link, access denied, etc.)
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");
    if (error) {
      const msg = encodeURIComponent(errorDesc || error);
      return NextResponse.redirect(
        new URL(`/check-email?error=${msg}`, url.origin),
      );
    }

    const code = url.searchParams.get("code");
    if (!code) {
      // no code? just go home
      return NextResponse.redirect(new URL("/", url.origin));
    }

    const supabase = createRouteHandlerClient({ cookies });

    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) {
      const msg = encodeURIComponent(exErr.message);
      return NextResponse.redirect(
        new URL(`/check-email?error=${msg}`, url.origin),
      );
    }

    // ✅ always go to homepage after successful verify
    return NextResponse.redirect(new URL("/", url.origin));
  } catch (e: any) {
    console.error("AUTH CALLBACK CRASH:", e);
    const msg = encodeURIComponent(
      "Callback failed. Please resend a new verification link.",
    );
    return NextResponse.redirect(
      new URL(`/check-email?error=${msg}`, url.origin),
    );
  }
}
