"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const redirectTo = useMemo(
    () => params.get("redirectedFrom") || params.get("next") || "/dashboard",
    [params]
  );

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace(redirectTo);
        router.refresh();
      }
    })();
  }, [redirectTo, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setCanResend(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!isEmail(cleanEmail)) return setError("Please enter a valid email.");
    if (!pw) return setError("Password is required.");

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pw,
    });
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed")) {
        setError("Please verify your email before logging in.");
        setCanResend(true);
        return;
      }
      if (msg.includes("invalid") || msg.includes("credentials"))
        return setError("Incorrect email or password.");
      if (msg.includes("too many") || msg.includes("rate limit"))
        return setError("Too many attempts. Please wait a bit.");
      return setError(error.message);
    }

    router.replace(redirectTo);
    router.refresh();
  };

  const resendVerification = async () => {
    setError(null);
    setNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!isEmail(cleanEmail)) return setError("Enter your registered email first.");

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    setResending(false);

    if (error)
      return setError(
        error.message.includes("too many")
          ? "Too many attempts. Please wait a minute."
          : error.message
      );

    setNotice("Confirmation email sent. Check your inbox.");
  };

  const inputBase =
    "w-full p-3 rounded-xl bg-white border placeholder-neutral-400 focus:outline-none focus:ring-2 transition text-neutral-900";
  const state = {
    ok: "border-emerald-400 focus:ring-emerald-400",
    bad: "border-red-400 focus:ring-red-400",
    neu: "border-neutral-200 focus:ring-orange-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* Floating orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-neutral-200/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center hover:opacity-80 transition">
            <img src="/logo.png" alt="Logo" className="h-11 w-auto" />
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:scale-105 transition"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Login card */}
      <main className="px-6 pt-32 pb-20 flex justify-center">
        <div className="max-w-md w-full relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-300/40 to-orange-300/40 rounded-3xl blur-3xl" />
          <div className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-8 shadow-xl shadow-red-500/10">
            <h2 className="text-2xl font-bold mb-2 text-center">Welcome back</h2>
            <p className="text-sm text-neutral-600 mb-6 text-center">
              Log in to continue your boxing training sessions.
            </p>

            {notice && (
              <div className="mb-4 text-sm rounded-lg p-3 border text-emerald-700 bg-emerald-50 border-emerald-200">
                {notice}
              </div>
            )}
            {error && (
              <div className="mb-4 text-sm rounded-lg p-3 border text-red-700 bg-red-50 border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm mb-1 text-neutral-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`${inputBase} ${
                    email ? (isEmail(email) ? state.ok : state.bad) : state.neu
                  }`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-neutral-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="text-xs text-neutral-600 hover:text-neutral-900"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputBase} ${pw ? state.ok : state.neu}`}
                />
              </div>

              {canResend && (
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={resending}
                  className="w-full text-sm font-semibold text-red-600 hover:text-red-700 underline disabled:opacity-60"
                >
                  {resending ? "Resending..." : "Resend verification email"}
                </button>
              )}
              <div className="mt-3 text-xs text-right text-neutral-500">
                <Link href="/forgot-password" className="underline hover:text-neutral-900">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 px-6 py-3 rounded-full font-semibold bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md hover:scale-105 transition disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Login"}
              </button>



              <p className="mt-3 text-xs text-center text-neutral-500">
                Don’t have an account?{" "}
                <Link href="/register" className="underline hover:text-neutral-700">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
