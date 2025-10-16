"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import Modal from "@/app/components/modal";
import { TermsContent, PrivacyContent } from "@/app/components/legal";
import { audit } from "@/app/lib/audit";

const EMAIL_OK = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const pwChecks = (p: string) => ({
  len: p.length >= 8,
  up: /[A-Z]/.test(p),
  lo: /[a-z]/.test(p),
  di: /\d/.test(p),
  sp: /[^A-Za-z0-9]/.test(p),
});

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [agree, setAgree] = useState(false);

  const [showPw, setShowPw] = useState(false);
  const [alert, setAlert] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [openPrivacy, setOpenPrivacy] = useState(false);

  const emailValid = EMAIL_OK(email.trim());
  const pwState = pwChecks(pw);
  const pwOk = Object.values(pwState).every(Boolean);
  const cfOk = cf && cf === pw;
  const canSubmit = emailValid && username.length >= 3 && pwOk && cfOk && agree && !loading;

// inside app/register/page.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setAlert(null);

  if (!canSubmit) return;

  setLoading(true);
  try {
    // only set consent flags if user actually checked the box
    const consent_date = agree ? new Date().toISOString() : null;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pw,
      options: {
        // IMPORTANT: tag the flow so callback knows this came from signup
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?type=signup`
            : undefined,
        // put what we need into user_metadata
        data: {
          username,
          privacy_agreed: !!agree,
          consent_date,              // optional extra; not strictly required
          desired_username: username // (kept if you use it elsewhere)
        },
      },
    });

    if (error) {
      const msg = /already|registered|exists/i.test(error.message)
        ? "Email already registered. Try logging in or reset password."
        : error.message;
      setAlert({ type: "error", text: msg });
      return;
    }

    await audit("auth.register", {
      method: "password",
      email,
      confirmed: Boolean(data.user?.email_confirmed_at),
    });

    setAlert({
      type: "success",
      text: "We sent a confirmation link to your email. Please verify to continue.",
    });
    router.push(`/check-email?email=${encodeURIComponent(email)}`);
  } finally {
    setLoading(false);
  }
};


  const inputBase =
    "w-full p-3 rounded-xl bg-white border placeholder-neutral-400 focus:outline-none focus:ring-2 transition text-neutral-900";
  const state = { ok: "border-emerald-400 focus:ring-emerald-400", bad: "border-red-400 focus:ring-red-400", neu: "border-neutral-200 focus:ring-orange-400" };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* floating orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-neutral-200/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center hover:opacity-80 transition">
            <img src="/logo.png" alt="Logo" className="h-11 w-auto" />
          </a>
          <a
            href="/login"
            className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:scale-105 transition"
          >
            Login
          </a>
        </div>
      </nav>

      {/* main form */}
      <main className="px-6 pt-32 pb-20 flex justify-center">
        <div className="max-w-md w-full relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-300/40 to-orange-300/40 rounded-3xl blur-3xl" />
          <div className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-8 shadow-xl shadow-red-500/10">
            <h2 className="text-2xl font-bold mb-2 text-center">Create your account</h2>
            <p className="text-sm text-neutral-600 mb-6 text-center">Train smarter. No installs. Just your camera.</p>

            {alert && (
              <div
                className={`mb-4 text-sm rounded-lg p-3 border ${
                  alert.type === "success"
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-red-700 bg-red-50 border-red-200"
                }`}
              >
                {alert.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm mb-1 text-neutral-700">Username</label>
                <input
                  className={`${inputBase} ${username ? state.ok : state.neu}`}
                  placeholder="e.g., southpaw_jo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-neutral-700">Email</label>
                <input
                  type="email"
                  className={`${inputBase} ${email ? (emailValid ? state.ok : state.bad) : state.neu}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-neutral-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="text-xs text-neutral-600 hover:text-neutral-900 focus:outline-none"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  className={`${inputBase} ${pw ? (pwOk ? state.ok : state.bad) : state.neu}`}
                  placeholder="••••••••"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
                <ul className="mt-2 text-xs space-y-1">
                  {Object.entries(pwState).map(([k, v]) => (
                    <li key={k} className={v ? "text-emerald-600" : "text-neutral-500"}>
                      {v ? "✓" : "•"} {k === "len" ? "8+ chars" : k === "up" ? "Uppercase" : k === "lo" ? "Lowercase" : k === "di" ? "Number" : "Special char"}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="text-sm text-neutral-700">Confirm password</label>
                <input
                  type={showPw ? "text" : "password"}
                  className={`${inputBase} ${cf ? (cfOk ? state.ok : state.bad) : state.neu}`}
                  placeholder="••••••••"
                  value={cf}
                  onChange={(e) => setCf(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 text-sm pt-2">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border border-neutral-300"
                />
                <span>
                  I agree to the{" "}
                  <button type="button" onClick={() => setOpenTerms(true)} className="underline hover:text-neutral-900">
                    Terms
                  </button>{" "}
                  and{" "}
                  <button type="button" onClick={() => setOpenPrivacy(true)} className="underline hover:text-neutral-900">
                    Privacy Policy
                  </button>.
                </span>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full mt-3 px-6 py-3 rounded-full font-semibold bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md hover:scale-105 transition disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Register"}
              </button>

              <p className="mt-3 text-xs text-neutral-500 text-center">
                Already have an account?{" "}
                <a href="/login" className="underline hover:text-neutral-700">
                  Log in
                </a>
              </p>
            </form>
          </div>
        </div>
      </main>

      <Modal open={openTerms} onClose={() => setOpenTerms(false)} title="Terms & Conditions">
        <TermsContent />
      </Modal>
      <Modal open={openPrivacy} onClose={() => setOpenPrivacy(false)} title="Privacy Policy">
        <PrivacyContent />
      </Modal>
    </div>
  );
}
