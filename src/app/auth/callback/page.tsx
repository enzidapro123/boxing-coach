// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [msg, setMsg] = useState("Finishing sign-in…");

  useEffect(() => {
    // supabase-js will pick up the hash (if detectSessionInUrl: true)
    // and set the session automatically. We just wait for it, then redirect.
    (async () => {
      try {
        // give the SDK a tick to process the URL fragment
        await new Promise((r) => setTimeout(r, 50));

        // optional: clear the hash from the URL (purely cosmetic)
        if (typeof window !== "undefined" && window.location.hash) {
          history.replaceState(null, "", window.location.pathname + window.location.search);
        }

        // check if we’re signed in now
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          setMsg("Could not complete sign-in. Please try again.");
          // fallback: go to login
          setTimeout(() => router.replace("/login"), 1200);
          return;
        }

        // If this came from a "signup" link, you might see ?type=signup
        const type = search.get("type");
        if (user) {
          setMsg(type === "signup" ? "Email confirmed! Redirecting…" : "Signed in! Redirecting…");
          router.replace("/dashboard");
        } else {
          // Not signed in (e.g., link expired)
          setMsg("Session not found. Please log in.");
          setTimeout(() => router.replace("/login"), 1200);
        }
      } catch {
        setMsg("Something went wrong. Redirecting to login…");
        setTimeout(() => router.replace("/login"), 1200);
      }
    })();
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
