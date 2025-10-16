// app/api/admin/delete-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1) Grab Bearer token from header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Build a service-role client so we can verify the token and bypass RLS
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfig: missing SUPABASE env vars" },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 3) Validate the caller with the token
    const { data: authUser, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authUser?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const callerId = authUser.user.id;

    // 4) Check role (must be super_admin)
    const { data: me, error: meErr } = await admin
      .from("users")
      .select("user_role")
      .eq("id", callerId)
      .maybeSingle();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
    if (me?.user_role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5) Parse body
    const { session_id } = await req.json().catch(() => ({}));
    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // 6) Delete session + its reps using service role (bypass RLS)
    // Order matters if FKs don't cascade.
    const { error: r1 } = await admin.from("session_reps").delete().eq("session_id", session_id);
    if (r1) return NextResponse.json({ error: r1.message }, { status: 500 });

    const { error: r2 } = await admin.from("training_sessions").delete().eq("id", session_id);
    if (r2) return NextResponse.json({ error: r2.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
