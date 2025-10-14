import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectedFrom = url.searchParams.get("redirectedFrom") || "/dashboard";

  const supabase = createRouteHandlerClient({ cookies });

  // 1) Exchange PKCE code → sets auth cookies for your app
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // If exchange failed, bounce to login
      return NextResponse.redirect(new URL("/login", url.origin));
    }
  }

  // 2) Fetch the signed-in user (now that cookies are set)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // 3) If we have a desired username in metadata, apply it once
    const desired = String(user.user_metadata?.desired_username ?? "").trim();

    if (desired.length >= 3 && /^[a-zA-Z0-9._]+$/.test(desired)) {
      // Check if my current row already has a username
      const { data: me } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (!me?.username) {
        // Availability (case-insensitive)
        const { data: taken } = await supabase
          .from("users")
          .select("id")
          .ilike("username", desired)
          .maybeSingle();

        if (!taken || taken.id === user.id) {
          // Write it (RLS policy 'update own' must be in place)
          await supabase.from("users").update({ username: desired }).eq("id", user.id);
        }
      }
    }
  }

  // 4) Redirect to the app
  return NextResponse.redirect(new URL(redirectedFrom, url.origin));
}
