// src/app/page.tsx (LandingPage)
"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import Modal from "@/app/components/modal";
import { TermsContent, PrivacyContent } from "@/app/components/legal";
import { useBranding } from "@/app/branding-provider"; // 🔹 branding context

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // modal state for Privacy & Terms
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);

  // 🔹 Current global branding (logo + colors)
  const branding = useBranding();

  // Smart NavLink: use <Link> for internal routes, <a> for hash/externals
  const NavLink = ({
    href,
    children,
    className = "text-neutral-600 hover:text-neutral-900 transition font-medium",
    style,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    style?: CSSProperties;
  }) => {
    const isInternal = href.startsWith("/") && !href.startsWith("//");
    if (isInternal) {
      return (
        <Link href={href} className={className} style={style}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={className} style={style}>
        {children}
      </a>
    );
  };

  async function onContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSentMsg(null);
    setErrMsg(null);
    setSending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    // Basic client checks
    if (!payload.name || !payload.email || !payload.message) {
      setErrMsg("Please fill out all fields.");
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fallback to mailto
        const params = new URLSearchParams({
          subject: "Contact: BlazePose Coach",
          body: `From: ${payload.name} <${payload.email}>\n\n${payload.message}`,
        });
        window.location.href = `mailto:rjbdelpilar@gmail.com?${params.toString()}`;
        setSentMsg(
          "Opening your email client… If nothing opens, email rjbdelpilar@gmail.com"
        );
      } else {
        setSentMsg("Thanks! Your message has been sent.");
        form.reset();
      }
    } catch {
      const params = new URLSearchParams({
        subject: "Contact: BlazePose Coach",
        body: `From: ${payload.name} <${payload.email}>\n\n${payload.message}`,
      });
      window.location.href = `mailto:rjbdelpilar@gmail.com?${params.toString()}`;
      setSentMsg(
        "Opening your email client… If nothing opens, email rjbdelpilar@gmail.com."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* Floating background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-40 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-neutral-200/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <Image
              src={branding?.logoUrl || "/logo.png"} // 🔹 dynamic logo
              alt="Logo"
              width={40}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how-it-works">How it works</NavLink>
            <NavLink href="#contact">Contact</NavLink>
            <NavLink href="/login">Login</NavLink>
            <NavLink
              href="/register"
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
              style={{
                background:
                  "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              }}
            >
              Get started
            </NavLink>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden rounded-lg border border-neutral-200 bg-white p-2 hover:bg-neutral-50 transition"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-neutral-200/50 bg-white/95 backdrop-blur-xl px-6 pb-6">
            {[
              ["#features", "Features"],
              ["#how-it-works", "How it works"],
              ["#contact", "Contact"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="block px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 font-medium transition"
              >
                {label}
              </a>
            ))}
            {/* internal route: use Link */}
            <Link
              href="/login"
              className="block px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 font-medium transition"
            >
              Login
            </Link>

            {/* Mobile: open modals for Privacy / Terms */}
            <button
              onClick={() => setOpenPrivacy(true)}
              className="mt-3 block w-full text-left px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 font-medium transition"
            >
              Privacy
            </button>
            <button
              onClick={() => setOpenTerms(true)}
              className="mt-1 block w-full text-left px-3 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 font-medium transition"
            >
              Terms
            </button>

            <Link
              href="/register"
              className="mt-3 block text-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg"
              style={{
                background:
                  "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              }}
            >
              Get started
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="px-6 pt-32 pb-20 md:pt-40">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          {/* Text side */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2 text-xs font-semibold text-red-700 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative rounded-full h-2 w-2 bg-red-600" />
              </span>
              Live AI feedback
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent">
                KnockTech
              </span>
              <br />
              boxing coaching <br />
              <span className="text-neutral-500">in your browser.</span>
            </h1>

            <p className="mt-6 text-lg text-neutral-600 max-w-xl leading-relaxed">
              Real-time BlazePose feedback to perfect your jab, cross, hook, and
              guard—no installs, just your camera.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white shadow-2xl transition hover:scale-105"
                style={{
                  background:
                    "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
                  boxShadow: "0 25px 40px rgba(0,0,0,0.25)",
                }}
              >
                Start free
                <svg
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-neutral-200 bg-white px-8 py-4 text-base font-semibold text-neutral-900 hover:border-red-200 hover:bg-red-50 transition"
              >
                See how it works
              </a>
            </div>
          </div>

          {/* Visual side */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-300/40 to-orange-300/40 rounded-3xl blur-3xl" />
            <div className="relative rounded-3xl border border-red-100/80 bg-white/80 p-4 backdrop-blur-xl shadow-2xl shadow-red-500/20">
              <div className="aspect-video rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 via-orange-50 to-red-50 grid place-items-center">
                <div className="text-neutral-700 text-sm">Demo coming soon</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="px-6 py-24 border-t border-neutral-200/50"
      >
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            What you{" "}
            <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
              get
            </span>
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Core tools that help you improve.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {[
            [
              "🎯",
              "Real-time feedback",
              "Instant feedback if your technique form is wrong.",
            ],
            [
              "📊",
              "Progress tracking",
              "See accuracy, sessions, and training time.",
            ],
            ["🥊", "Technique library", "Jabs, crosses, hooks, and guard."],
            ["🎥", "Session review", "review your summary session."],
            [
              "⚡",
              "realtime tracking",
              "BlazePose tracks keypoints in real time.",
            ],
            [
              "🏆",
              "Skill progression",
              "Level up as your progression imrpove.",
            ],
          ].map(([icon, title, desc]) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-red-100 bg-white/80 backdrop-blur p-8 shadow-lg hover:-translate-y-2 hover:shadow-2xl hover:shadow-red-500/20 transition"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-500 text-2xl shadow-lg shadow-red-500/30 mb-4 group-hover:scale-110 transition">
                {icon}
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="px-6 py-24 bg-gradient-to-b from-neutral-50 to-white"
      >
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            How it{" "}
            <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
              works
            </span>
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Three steps. That’s it.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-7xl mx-auto">
          {[
            {
              step: "01",
              title: "Pick a technique",
              desc: "Choose jab, cross, hook, uppercut, or guard",
              color: "from-red-600 to-red-500",
            },
            {
              step: "02",
              title: "Train live",
              desc: "Turn on your webcam—get corrections in real time.",
              color: "from-orange-600 to-orange-500",
            },
            {
              step: "03",
              title: "Improve fast",
              desc: "Track results and perfect your form.",
              color: "from-red-500 to-orange-500",
            },
          ].map((s) => (
            <div key={s.step} className="relative group">
              <div
                className={`absolute -inset-1 bg-gradient-to-r ${s.color} opacity-20 group-hover:opacity-40 rounded-3xl blur transition`}
              />
              <div className="relative rounded-2xl border border-red-100/80 bg-white/80 backdrop-blur p-10 shadow-xl shadow-red-500/10 group-hover:shadow-2xl group-hover:shadow-red-500/20 transition-all">
                <div
                  className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${s.color} text-white text-xl font-bold shadow-lg shadow-red-500/40`}
                >
                  {s.step}
                </div>
                <h3 className="text-2xl font-bold">{s.title}</h3>
                <p className="mt-3 text-neutral-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section
        id="contact"
        className="px-6 py-24 border-y border-neutral-200/60"
      >
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-4xl font-bold md:text-5xl tracking-tight">
              Contact{" "}
              <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                us
              </span>
            </h2>
            <p className="mt-4 text-lg text-neutral-600">
              Questions or feedback? We’d love to hear from you.
            </p>

            <div className="mt-6 space-y-2 text-neutral-700">
              <p>
                📧{" "}
                <a
                  className="text-neutral-900"
                  href="mailto:rjbdelpilar@gmail.com"
                >
                  rjbdelpilar@gmail.com
                </a>
              </p>
              <p>
                📧{" "}
                <a
                  className="text-neutral-900"
                  href="mailto:enzidapro@gmail.com"
                >
                  enzidapro@gmail.com
                </a>
              </p>
            </div>
          </div>

          <form
            onSubmit={onContactSubmit}
            className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-red-500/20 space-y-4"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm text-neutral-700 mb-1"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                className="w-full p-3 rounded-xl bg-white border border-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-neutral-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full p-3 rounded-xl bg-white border border-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm text-neutral-700 mb-1"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full p-3 rounded-xl bg-white border border-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="How can we help?"
                required
              />
            </div>

            {sentMsg && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                {sentMsg}
              </p>
            )}
            {errMsg && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {errMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full mt-2 rounded-full px-8 py-3 text-white font-semibold shadow-lg hover:scale-105 hover:shadow-xl transition disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
                boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
              }}
            >
              {sending ? "Sending…" : "Send message"}
            </button>
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-gradient-to-b from-white to-neutral-50 border-y border-red-100/50 text-center">
        <h2 className="text-4xl md:text-5xl font-bold">
          Ready to{" "}
          <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
            start?
          </span>
        </h2>
        <p className="mt-4 text-xl text-neutral-600">
          Train with knocktech—right in your browser.
        </p>
        <Link
          href="/register"
          className="mt-10 inline-flex items-center gap-2 rounded-full px-10 py-5 text-lg font-semibold text-white shadow-2xl hover:scale-105 transition"
          style={{
            background:
              "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
            boxShadow: "0 25px 45px rgba(0,0,0,0.25)",
          }}
        >
          Get started free
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
        <p className="mt-6 text-sm text-neutral-500"></p>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-12 bg-gradient-to-b from-white to-neutral-50 text-center text-sm text-neutral-600">
        <Image
          src={branding?.logoUrl || "/logo.png"} // 🔹 dynamic logo here too
          alt="Logo"
          width={40}
          height={40}
          className="h-10 w-auto mx-auto mb-4 opacity-90"
          priority
        />
        <div className="flex flex-wrap justify-center gap-6">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#contact">Contact</NavLink>

          {/* Open modals instead of routing */}
          <button
            onClick={() => setOpenPrivacy(true)}
            className="text-neutral-600 hover:text-neutral-900 transition font-medium"
          >
            Privacy
          </button>
          <button
            onClick={() => setOpenTerms(true)}
            className="text-neutral-600 hover:text-neutral-900 transition font-medium"
          >
            Terms
          </button>
        </div>
      </footer>

      {/* POPUPS */}
      <Modal
        open={openPrivacy}
        onClose={() => setOpenPrivacy(false)}
        title="Privacy Policy"
      >
        <PrivacyContent />
      </Modal>
      <Modal
        open={openTerms}
        onClose={() => setOpenTerms(false)}
        title="Terms & Conditions"
      >
        <TermsContent />
      </Modal>
    </div>
  );
}
