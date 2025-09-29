// app/check-email/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function CheckEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailFromQuery);
  const [isSending, setIsSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [emailFromQuery]);

  const canSend = useMemo(() => !!email && /\S+@\S+\.\S+/.test(email), [email]);

  async function resend() {
    setMsg(null);
    setErr(null);
    if (!canSend) {
      setErr("Please enter a valid email address.");
      return;
    }
    setIsSending(true);

    // Resend the confirmation email for signup
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });

    setIsSending(false);
    if (error) {
      setErr(error.message);
    } else {
      setMsg("A new confirmation link has been sent. Please check your inbox.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Top Nav (glassy) */}
      <nav className="fixed top-0 w-full bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">🥊</div>
            <span className="text-xl font-bold">BlazePose Coach</span>
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="/login" className="text-gray-300 hover:text-white">Login</a>
            <a href="/register" className="text-gray-300 hover:text-white">Register</a>
          </div>
        </div>
      </nav>

      {/* Page */}
      <main className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-3">Check your email</h1>
              <p className="text-gray-300">
                We’ve sent a verification link{email ? <> to <span className="font-semibold text-white">{email}</span></> : ""}.<br />
                Please click it to confirm your account, then come back to log in.
              </p>
            </div>

            {/* Email input (editable in case user mistyped) */}
            <div className="mt-8 max-w-md mx-auto">
              <label className="block text-sm mb-1 text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-600"
              />
              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resend}
                  disabled={!canSend || isSending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg font-semibold transition disabled:opacity-60"
                >
                  {isSending ? "Sending…" : "Resend Confirmation Email"}
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition"
                >
                  Go to Login
                </button>
              </div>

              {msg && (
                <p className="mt-4 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  {msg}
                </p>
              )}
              {err && (
                <p className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  {err}
                </p>
              )}

              <div className="mt-6 text-sm text-gray-400">
                Didn’t get the email? Check spam/junk, or ensure you entered the correct address. You can also try resending.
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2025 BlazePose Coach. Train smarter.
          </p>
        </div>
      </main>
    </div>
  );
}
