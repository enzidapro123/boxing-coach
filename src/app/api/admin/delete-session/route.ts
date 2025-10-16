// app/api/admin/delete-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Request body validator (no `any`) */
const DeleteSessionBody = z.object({
  session_id: z.string().min(1, "session_id is required"),
});

export async function POST(req: NextRequest) {
  try {
    // 1) Grab Bearer token from header
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Build a service-role client so we can verify the token and bypass RLS
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfig: missing SUPABASE env vars" },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

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

    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 500 });
    }
    if (me?.user_role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5) Parse + validate body (treat req.json as unknown, then Zod-validate)
    const raw = (await req.json()) as unknown;
    const { session_id } = DeleteSessionBody.parse(raw);

    // 6) Delete session + its reps using service role (bypass RLS)
    const { error: repsErr } = await admin
      .from("session_reps")
      .delete()
      .eq("session_id", session_id);
    if (repsErr) {
      return NextResponse.json({ error: repsErr.message }, { status: 500 });
    }

    const { error: sessErr } = await admin
      .from("training_sessions")
      .delete()
      .eq("id", session_id);
    if (sessErr) {
      return NextResponse.json({ error: sessErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    // Properly narrow `unknown` (no `any`)
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
