"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/app/lib/supabaseClient";

// Inner component that uses useSearchParams + all your logic
function CheckEmailInner() {
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
    if (!canSend) return setErr("Please enter a valid email address.");

    setIsSending(true);
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

    if (error) setErr(error.message);
    else
      setMsg("A new confirmation link has been sent. Please check your inbox.");
  }

  const inputBase =
    "w-full p-3 rounded-xl bg-white border placeholder-neutral-400 focus:outline-none focus:ring-2 transition text-neutral-900";
  const state = {
    ok: "border-emerald-400 focus:ring-emerald-400",
    bad: "border-red-400 focus:ring-red-400",
    neu: "border-neutral-200 focus:ring-orange-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* Floating gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-neutral-200/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition"
          >
            <Image src="/logo.png" alt="Logo" width={44} height={44} priority />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/login"
              className="text-neutral-600 hover:text-neutral-900 font-medium"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:scale-105 hover:shadow-xl"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Card */}
      <main className="px-6 pt-32 pb-20 flex justify-center">
        <div className="max-w-md w-full relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-300/40 to-orange-300/40 rounded-3xl blur-3xl" />
          <div className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-8 shadow-xl shadow-red-500/10">
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-sm text-neutral-600">
              We’ve sent a verification link
              {email ? (
                <>
                  {" "}
                  to{" "}
                  <span className="font-semibold text-neutral-900">
                    {email}
                  </span>
                </>
              ) : null}
              . Please click it to confirm your account, then come back to log
              in.
            </p>

            {/* Editable email (in case of typo) */}
            <div className="mt-8">
              <label className="block text-sm mb-1 text-neutral-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`${inputBase} ${
                  email.length === 0
                    ? state.neu
                    : canSend
                    ? state.ok
                    : state.bad
                }`}
              />

              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resend}
                  disabled={!canSend || isSending}
                  className="flex-1 px-6 py-3 rounded-full font-semibold bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md hover:scale-105 transition disabled:opacity-60"
                >
                  {isSending ? "Sending…" : "Resend"}
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-3 rounded-full font-semibold border-2 border-neutral-200 bg-white text-neutral-900 hover:border-red-200 hover:bg-red-50 transition"
                >
                  Go to Login
                </button>
              </div>

              {msg && (
                <p className="mt-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  {msg}
                </p>
              )}
              {err && (
                <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {err}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Outer component that wraps everything in Suspense
export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center text-neutral-700">
          Loading…
        </div>
      }
    >
      <CheckEmailInner />
    </Suspense>
  );
}
