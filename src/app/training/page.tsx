"use client";

import { useEffect, useState } from "react";
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
    { name: "Jab", color: "from-blue-500 to-indigo-600", emoji: "👊" },
    { name: "Cross", color: "from-green-500 to-emerald-600", emoji: "⚡" },
    { name: "Hook", color: "from-purple-500 to-pink-600", emoji: "🌀" },
    { name: "Uppercut", color: "from-orange-500 to-red-600", emoji: "🔥" },
    { name: "Guard", color: "from-gray-600 to-slate-800", emoji: "🛡️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Top Navbar */}
      <header className="fixed top-0 w-full bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">
              🥊
            </div>
            <span className="text-xl font-bold">BlazePose Coach</span>
          </a>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">{userName}</span>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-lg font-bold">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{userName ? userName.charAt(0).toUpperCase() : "U"}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Start a New Training Session 👊
            </h1>
            <p className="text-lg text-gray-300">
              Choose a technique below to begin personalized AI-powered training.
            </p>
          </section>

          {/* Techniques Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {techniques.map((t) => (
              <a
                key={t.name}
                href={`/session/${t.name.toLowerCase()}`}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.color} p-8 shadow-lg hover:scale-[1.03] transition-transform`}
              >
                <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:opacity-40 transition">
                  {t.emoji}
                </div>
                <h3 className="text-2xl font-bold mb-2">{t.name}</h3>
                <p className="text-gray-200 text-sm">
                  Begin your {t.name} training session
                </p>
                <div className="mt-6 inline-block bg-white/20 px-4 py-2 rounded-full text-sm font-semibold group-hover:bg-white/30 transition">
                  Start Now →
                </div>
              </a>
            ))}
          </section>

          {/* CTA */}
          <div className="text-center mt-20">
            <a
              href="/dashboard"
              className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-10 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
