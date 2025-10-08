// app/auth/callback/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// ⬇️ Use a relative import to avoid alias issues
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [msg, setMsg] = useState("Finalizing sign-in…");

  useEffect(() => {
    // Will hold the unsubscribe handle from onAuthStateChange
    let subscription: { unsubscribe: () => void } | undefined;

    (async () => {
      try {
        const errorDesc = search.get("error_description");
        const type = search.get("type"); // e.g., "signup" or "recovery"
        const code = search.get("code"); // PKCE code

        if (errorDesc) {
          setMsg(errorDesc);
          setTimeout(() => router.replace("/login"), 1200);
          return;
        }

        // If we're already signed in, go straight to the dashboard.
        {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            setMsg(
              type === "signup"
                ? "Email confirmed! Redirecting…"
                : "Signed in! Redirecting…"
            );
            router.replace("/dashboard");
            return;
          }
        }

        // 1) PKCE flow (?code=...)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setMsg("Could not complete sign-in. Please try again.");
            setTimeout(() => router.replace("/login"), 1200);
            return;
          }
        } else {
          // 2) Hash flow (#access_token=..., #refresh_token=...)
          // Give the SDK a moment to auto-detect the session in the URL
          await new Promise((r) => setTimeout(r, 50));

          let {
            data: { user },
          } = await supabase.auth.getUser();

          // If still no user and hash tokens exist, set session manually as a fallback
          if (!user && typeof window !== "undefined" && window.location.hash) {
            const params = new URLSearchParams(
              window.location.hash.substring(1)
            );
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");
            if (access_token && refresh_token) {
              const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (error) {
                setMsg("Could not complete sign-in. Please try again.");
                setTimeout(() => router.replace("/login"), 1200);
                return;
              }
            }
          }
        }

        // Clean the URL (remove hash/query noise)
        if (typeof window !== "undefined") {
          history.replaceState(null, "", "/auth/callback");
        }

        // Subscribe in case the session is established a moment later
        const listener = supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN") {
            setMsg(
              type === "signup"
                ? "Email confirmed! Redirecting…"
                : "Signed in! Redirecting…"
            );
            router.replace("/dashboard");
          }
        });
        subscription = listener.data.subscription;

        // Final check — if session is already present now, go.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setMsg(
            type === "signup"
              ? "Email confirmed! Redirecting…"
              : "Signed in! Redirecting…"
          );
          router.replace("/dashboard");
        } else {
          setMsg("Session not found. Please log in.");
          setTimeout(() => router.replace("/login"), 1200);
        }
      } catch {
        setMsg("Something went wrong. Redirecting to login…");
        setTimeout(() => router.replace("/login"), 1200);
      }
    })();

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [router, search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
        <div className="text-2xl font-bold mb-2">BlazePose Coach</div>
        <p className="text-gray-300">{msg}</p>
      </div>
    </div>
  );
}
