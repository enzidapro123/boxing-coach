// app/lib/audit.ts
import { supabase } from "@/app/lib/supabaseClient";

export type AuditDetails = Record<string, unknown>;

/**
 * Write an audit row.
 * 1) If a session exists, try a direct insert (fast path under RLS).
 * 2) Otherwise, call the RPC (SECURITY DEFINER) so it can still log.
 * Never throws.
 */
export async function audit(
  action: string,
  details: AuditDetails = {}
): Promise<void> {
  try {
    // Prefer direct insert when a session exists (RLS: user_id must match auth.uid())
    const { data: sess } = await supabase.auth.getSession();
    const hasSession = !!sess?.session;

    if (hasSession) {
      const { data: au } = await supabase.auth.getUser();
      const uid = au?.user?.id ?? null;

      const { error: insErr } = await supabase.from("audit_logs").insert({
        user_id: uid, // must equal auth.uid() by policy
        action,
        details,
      });

      if (!insErr) return;
      console.warn("[audit] direct insert failed, trying RPC:", insErr.message);
    }

    // Fallback to RPC (works even if no session, if granted)
    const { error: rpcErr } = await supabase.rpc("audit_log", {
      _action: action,
      _details: details,
    });
    if (rpcErr) console.warn("[audit] RPC failed:", rpcErr.message);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[audit] unexpected error:", msg);
  }
}
