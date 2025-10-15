// app/forgot-password/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type Mode = "request" | "reset";

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<Mode>("request");
  const [email, setEmail] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Decide our redirect URL (where the email link should land)
  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    // Send them back to this same page; we’ll detect recovery session here
    return `${window.location.origin}/forgot-password`;
  }, []);

  // On mount: if user is logged in OR a recovery session comes in, switch to reset mode
  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setMode("reset");
      // Listen for recovery event when the user clicks the email link
      const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
        if (evt === "PASSWORD_RECOVERY") setMode("reset");
      });
      unsub = sub?.subscription.unsubscribe;
    })();

    return () => {
      try {
        unsub?.();
      } catch {}
    };
  }, []);

  const sendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setBanner({ kind: "err", text: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo,
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate")) {
        setBanner({ kind: "err", text: "Too many attempts. Please try again shortly." });
      } else {
        setBanner({ kind: "err", text: error.message });
      }
      return;
    }

    setBanner({
      kind: "ok",
      text: "Reset email sent. Check your inbox and follow the link.",
    });
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const p1 = pw1.trim();
    const p2 = pw2.trim();

    if (p1.length < 8) {
      setBanner({ kind: "err", text: "Password must be at least 8 characters." });
      return;
    }
    if (p1 !== p2) {
      setBanner({ kind: "err", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setLoading(false);

    if (error) {
      setBanner({ kind: "err", text: error.message });
      return;
    }

    setBanner({ kind: "ok", text: "Password updated. You can close this page now." });
    setPw1("");
    setPw2("");
  };

  const inputBase =
    "w-full p-3 rounded-xl bg-white border placeholder-neutral-400 focus:outline-none focus:ring-2 transition text-neutral-900";
  const state = {
    neu: "border-neutral-200 focus:ring-orange-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-neutral-200/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center hover:opacity-80 transition">
            <img src="/logo.png" alt="Logo" className="h-11 w-auto" />
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold hover:bg-neutral-50 transition"
          >
            Back to Login
          </Link>
        </div>
      </nav>

      {/* Card */}
      <main className="px-6 pt-32 pb-20 flex justify-center">
        <div className="max-w-md w-full relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-300/40 to-orange-300/40 rounded-3xl blur-3xl" />
          <div className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-8 shadow-xl shadow-red-500/10">
            <h2 className="text-2xl font-bold mb-2 text-center">
              {mode === "reset" ? "Set a new password" : "Forgot your password?"}
            </h2>
            <p className="text-sm text-neutral-600 mb-6 text-center">
              {mode === "reset"
                ? "Enter a new password for your account."
                : "Enter your email and we'll send you a reset link."}
            </p>

            {banner && (
              <div
                className={`mb-4 text-sm rounded-lg p-3 border ${
                  banner.kind === "ok"
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-red-700 bg-red-50 border-red-200"
                }`}
              >
                {banner.text}
              </div>
            )}

            {mode === "request" ? (
              <form onSubmit={sendResetEmail} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm mb-1 text-neutral-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${inputBase} ${state.neu}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 px-6 py-3 rounded-full font-semibold bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md hover:scale-105 transition disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>

                <p className="mt-3 text-xs text-center text-neutral-500">
                  Remembered it?{" "}
                  <Link href="/login" className="underline hover:text-neutral-700">
                    Back to login
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={updatePassword} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm mb-1 text-neutral-700">New password</label>
                  <input
                    type="password"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    placeholder="At least 8 characters"
                    className={`${inputBase} ${state.neu}`}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-neutral-700">Confirm new password</label>
                  <input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    placeholder="Repeat new password"
                    className={`${inputBase} ${state.neu}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 px-6 py-3 rounded-full font-semibold bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md hover:scale-105 transition disabled:opacity-60"
                >
                  {loading ? "Updating…" : "Update password"}
                </button>

                <p className="mt-3 text-xs text-center text-neutral-500">
                  Having trouble?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("request")}
                    className="underline hover:text-neutral-700"
                  >
                    Send a reset email instead
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
