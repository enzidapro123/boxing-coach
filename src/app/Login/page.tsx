"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setCanResend(false);

    const cleanEmail = email.trim().toLowerCase();
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setIsLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed")) {
        setError("Please verify your email before logging in.");
        setCanResend(true);
      } else if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        setError("Incorrect email or password.");
      } else {
        setError(error.message);
      }
      return;
    }
    router.push("/dashboard");
  };

  const resendVerification = async () => {
    setIsResending(true);
    setNotice(null);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

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

    setIsResending(false);

    if (error) {
      const msg = error.message.includes("over email rate limit")
        ? "Too many attempts. Please wait a minute and try again."
        : error.message;
      setError(msg);
    } else {
      setNotice("Confirmation email sent. Please check your inbox.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">
                🥊
              </div>
              <span className="text-xl font-bold">BlazePose Coach</span>
            </a>
            <div className="hidden md:flex items-center gap-6">
              <a href="/register" className="text-gray-300 hover:text-white transition-colors">
                Register
              </a>
              <a
                href="/login"
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-5 py-2.5 rounded-lg font-semibold transition-all"
              >
                Login
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="pt-28 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mx-auto w-full max-w-md">
            {/* Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold">Welcome back</h1>
                <p className="text-gray-300 mt-2">
                  Enter your credentials to access your training dashboard.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm mb-1 text-gray-300">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm mb-1 text-gray-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="text-xs text-gray-300 hover:text-white"
                    >
                      {showPwd ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {notice && (
                  <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                    {notice}
                  </p>
                )}
                {error && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      {error}
                    </p>
                    {canResend && (
                      <button
                        type="button"
                        onClick={resendVerification}
                        disabled={isResending}
                        className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold disabled:opacity-60"
                      >
                        {isResending ? "Resending…" : "Resend verification email"}
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg font-semibold transition-all transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing in..." : "Login"}
                </button>
              </form>

              <div className="mt-6 text-sm text-center text-gray-300">
                <a href="/forgot-password" className="hover:text-white">
                  Forgot password?
                </a>
              </div>

              <div className="mt-4 text-sm text-center text-gray-300">
                Don&apos;t have an account?{" "}
                <a
                  href="/register"
                  className="font-semibold text-white hover:underline"
                >
                  Create one
                </a>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              © 2025 BlazePose Coach. Train smarter.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
