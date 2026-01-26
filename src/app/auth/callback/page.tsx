"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

function parseHash(hash: string) {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    error: params.get("error"),
    error_description: params.get("error_description"),
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      // Sometimes errors are in query
      const qError = searchParams.get("error");
      const qErrorDesc = searchParams.get("error_description");

      // Tokens are usually in hash
      const { access_token, refresh_token, error, error_description } =
        parseHash(window.location.hash);

      const msg = qErrorDesc || error_description || qError || error;

      // If link expired/invalid -> send to check-email page
      if (msg) {
        router.replace(`/check-email?error=${encodeURIComponent(msg)}`);
        return;
      }

      // If no tokens, just go home (or login if you prefer)
      if (!access_token || !refresh_token) {
        router.replace("/");
        return;
      }

      // Set session in browser
      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (setErr) {
        router.replace(
          `/check-email?error=${encodeURIComponent(setErr.message)}`,
        );
        return;
      }

      // ✅ Success: go to homepage
      router.replace("/");
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen grid place-items-center text-neutral-700">
      Confirming your email…
    </div>
  );
}
