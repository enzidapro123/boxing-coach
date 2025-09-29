"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    // 0) Check if username is available via RPC (works with RLS)
    const { data: isFree, error: rpcErr } = await supabase
      .rpc("is_username_available", { name: username });

    if (rpcErr) {
      setIsLoading(false);
      setError(rpcErr.message);
      return;
    }
    if (!isFree) {
      setIsLoading(false);
      setError("That username is already taken.");
      return;
    }

    // 1) Create account in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });

    if (signUpError) {
      setIsLoading(false);
      setError(signUpError.message);
      return;
    }

    // 2) Insert profile row ONLY if we have a session (email confirm OFF)
    //    If email confirmation is ON, session is null -> skip insert to avoid RLS errors
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: u.user.id, // must equal auth.uid() to pass RLS
          email,
          username,
        },
      ]);
      if (insertError) {
        setIsLoading(false);
        setError(insertError.message);
        return;
      }
      setIsLoading(false);
      router.push("/login");
      return;
    }

    // 3) No session yet (likely because email confirmation is enabled)
    //    Redirect to a "check your email" page; you can auto-create the profile using a DB trigger.
    setIsLoading(false);
    router.push("/check-email");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Top Nav (matches LandingPage) */}
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
              <a href="/login" className="text-gray-300 hover:text-white transition-colors">
                Login
              </a>
              <a
                href="/register"
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-5 py-2.5 rounded-lg font-semibold transition-all"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="pt-28 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mx-auto w-full max-w-md">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold">Create your account</h1>
                <p className="text-gray-300 mt-2">
                  Start training with AI-powered feedback.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm mb-1 text-gray-300">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="e.g., southpaw_jo"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-600"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    minLength={3}
                    required
                  />
                </div>

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
                    placeholder="••••••••"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm mb-1 text-gray-300">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-600"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg font-semibold transition-all transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating account..." : "Register"}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  By continuing, you agree to our{" "}
                  <a href="/terms" className="underline hover:text-white">Terms</a> and{" "}
                  <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>.
                </p>
              </form>

              <div className="mt-4 text-sm text-center text-gray-300">
                Already have an account?{" "}
                <a href="/login" className="font-semibold text-white hover:underline">
                  Log in
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
