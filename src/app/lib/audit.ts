import { supabase } from "@/app/lib/supabaseClient";

/**
 * Writes an audit row. Tries RPC first; if the function is missing or blocked,
 * falls back to a direct insert (uses RLS "own-insert" policy).
 *
 * Never throws. Logs warnings to console if it fails.
 */
export async function audit(action: string, details: Record<string, any> = {}): Promise<void> {
  try {
    // Try RPC first
    const { error: rpcErr } = await supabase.rpc("audit_log", {
      _action: action,
      _details: details,
    });

    // If RPC works, we're done
    if (!rpcErr) return;

    // If RPC is missing or not executable, fallback to direct insert
    const notFound = rpcErr.code === "42883" || /function .* does not exist/i.test(rpcErr.message);
    if (!notFound) {
      console.warn("[audit] RPC failed, trying fallback insert:", rpcErr.message);
    }

    // Need current user id for the direct insert (RLS policy requires it)
    const { data: au } = await supabase.auth.getUser();
    const uid = au?.user?.id ?? null;

    const { error: insErr } = await supabase.from("audit_logs").insert({
      user_id: uid,          // RLS: must match auth.uid()
      action,
      details,
    });

    if (insErr) {
      console.warn("[audit] fallback insert failed:", insErr.message);
    }
  } catch (e: any) {
    console.warn("[audit] unexpected error:", e?.message || e);
  }
}
