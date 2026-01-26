// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // If Supabase returns an error (expired link, etc.)
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");
  if (error) {
    const msg = encodeURIComponent(errorDesc || error);
    return NextResponse.redirect(
      new URL(`/check-email?error=${msg}`, url.origin),
    );
  }

  // PKCE: Supabase will return ?code=...
  const code = url.searchParams.get("code");
  const supabase = createRouteHandlerClient({ cookies });

  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) {
      const msg = encodeURIComponent(exErr.message);
      return NextResponse.redirect(
        new URL(`/check-email?error=${msg}`, url.origin),
      );
    }
  }

  // ✅ Your requirement: after verify, send to homepage
  return NextResponse.redirect(new URL("/", url.origin));
}
