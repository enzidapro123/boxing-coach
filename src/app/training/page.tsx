// app/training/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";

export default function TrainingPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      setUserName(profile?.username || user.email);
      setAvatarUrl(profile?.avatar_url || null);
    };

    getUser();
  }, []);

  const techniques = [
    { name: "Jab", aura: "from-red-600 to-orange-500" },
    { name: "Cross", aura: "from-orange-600 to-red-500" },
    { name: "Hook", aura: "from-pink-600 to-rose-500" },
    { name: "Uppercut", aura: "from-red-500 to-orange-500" },
    { name: "Guard", aura: "from-amber-600 to-red-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* Floating gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-52 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-red-500/25 to-orange-500/25 blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          {/* Left section: Icon + Back to Dashboard */}
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition"
              prefetch
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Back button */}
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-red-500/30 hover:scale-[1.03] transition"
              prefetch
            >
              Back to Dashboard
            </Link>
          </div>

          {/* User info */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">{userName}</span>
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-red-200/60 bg-gradient-to-br from-red-600 to-orange-500 text-white flex items-center justify-center font-bold">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span>{userName ? userName.charAt(0).toUpperCase() : "U"}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="px-6 pt-20 pb-24">
        <div className="mx-auto max-w-7xl">
          {/* Heading */}
          <section className="text-center mb-14">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Start a new{" "}
              <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent">
                training session
              </span>
            </h1>
            <p className="mt-4 text-lg text-neutral-600">
              Choose a technique below to begin personalized AI-powered
              coaching.
            </p>
          </section>

          {/* Techniques Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {techniques.map((t) => (
              <Link
                key={t.name}
                href={`/session/${t.name.toLowerCase()}`}
                className="group relative rounded-3xl border border-red-100/70 bg-white/80 backdrop-blur p-7 shadow-sm hover:shadow-md transition"
                prefetch
              >
                {/* Hover aura */}
                <div
                  className={`pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-br ${t.aura} opacity-0 group-hover:opacity-20 blur transition`}
                />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold">{t.name}</h3>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">
                    Begin your {t.name.toLowerCase()} training session.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition group-hover:border-red-200 group-hover:bg-red-50">
                    Start now
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
                  </div>
                </div>
              </Link>
            ))}
          </section>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-8 py-4 text-white font-semibold shadow-md hover:scale-105 transition"
              prefetch
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
