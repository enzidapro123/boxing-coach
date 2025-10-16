// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
export default function CallbackPage() {
  return null; // nothing is rendered; users won't see this
}
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next") ||
    url.searchParams.get("redirectedFrom") ||
    "/dashboard";

  const supabase = createRouteHandlerClient({ cookies });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login", url.origin));
    }
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return NextResponse.redirect(new URL(user ? next : "/login", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
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
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
