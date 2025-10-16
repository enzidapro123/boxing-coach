// app/api/admin/delete-user/route.ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function hasUserId(x: unknown): x is { user_id: string } {
  return (
    typeof x === "object" &&
    x !== null &&
    "user_id" in x &&
    typeof (x as Record<string, unknown>).user_id === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfig: missing SUPABASE env vars" },
        { status: 500 }
      );
    }

    // 1) Read token from Authorization header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) User-scoped client (using the bearer token)
    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3) Role check
    const { data: me, error: meErr } = await userClient
      .from("users")
      .select("user_role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (meErr)
      return NextResponse.json({ error: meErr.message }, { status: 500 });
    if (me?.user_role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4) Parse body safely (no `any`)
    const raw = await req.json().catch(() => null);
    if (!hasUserId(raw)) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }
    const { user_id } = raw;

    // 5) Service-role client for destructive ops
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    await admin.from("session_reps").delete().eq("user_id", user_id);
    await admin.from("training_sessions").delete().eq("user_id", user_id);
    await admin.from("users").delete().eq("id", user_id);

    const { error: delAuthErr } = await admin.auth.admin.deleteUser(user_id);
    if (delAuthErr) {
      return NextResponse.json({ error: delAuthErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
