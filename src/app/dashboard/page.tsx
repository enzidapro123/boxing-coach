"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

/* ----------------------------- Types ----------------------------- */
type SessionRow = {
  id: string;
  user_id: string;
  technique: string;
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  total_reps: number | null;
};

/* --------------------------- Helpers ----------------------------- */
const iconFor = (tech: string) => {
  const t = (tech || "").toLowerCase();
  if (t === "jab") return "👊";
  if (t === "cross") return "💥";
  if (t === "hook") return "🌟";
  if (t === "uppercut") return "⚡";
  if (t === "guard") return "🛡️";
  return "🥊";
};

const pretty = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const statGradientText = (key: "red" | "blue" | "green" | "purple") => {
  if (key === "red")
    return "bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent";
  if (key === "blue")
    return "bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent";
  if (key === "green")
    return "bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent";
  return "bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent";
};

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<SessionRow[]>([]);

  // --- Fetch user and sessions
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setErr(null);
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        // Fetch username/avatar from your users table
        const { data: profile } = await supabase
          .from("users")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled) {
          setUserName(profile?.username ?? user.email ?? "User");
          setAvatarUrl(profile?.avatar_url ?? null);
        }

        // Fetch recent sessions (SAME LOGIC AS /history)
        const { data, error } = await supabase
          .from("training_sessions")
          .select(
            "id, user_id, technique, started_at, finished_at, duration_sec, total_reps"
          )
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        if (!cancelled) setRecent(data ?? []);
      } catch (e: any) {
        if (!cancelled) setErr(e.message || "Error loading dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-900 text-white">
        Loading dashboard…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-900 text-white">
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
          <div className="font-semibold mb-2">Error</div>
          <div className="text-sm text-gray-300">{err}</div>
          <div className="mt-4">
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------- UI ------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navbar */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">
              🥊
            </div>
            <h1 className="text-xl font-bold text-white">BlazePose Coach</h1>
          </div>

          <UserBadge
            userName={userName}
            avatarUrl={avatarUrl}
            onSignOut={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <section className="mb-10">
          <h2 className="text-4xl font-bold text-white mb-2">
            Welcome back, {userName} 👊
          </h2>
          <p className="text-gray-400 text-lg">
            Here's an overview of your recent training sessions.
          </p>
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6">
              Quick Actions
            </h3>
            <div className="flex flex-col gap-4">
              <a
                href="/training"
                className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-4 rounded-xl text-center font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                🎯 Start Training
              </a>
              <a
                href="/history"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-4 rounded-xl text-center font-semibold transition-all"
              >
                📊 View History
              </a>
              <a
                href="/profile"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-4 rounded-xl text-center font-semibold transition-all"
              >
                ⚙️ Profile Settings
              </a>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6">
              Recent Activity
            </h3>

            {recent.length > 0 ? (
              <div className="space-y-4">
                {recent.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{iconFor(r.technique)}</span>
                        <div>
                          <div className="font-semibold text-white text-lg">
                            {pretty(r.technique)}
                          </div>
                          <p className="text-sm text-gray-400">
                            {r.started_at
                              ? new Date(r.started_at).toLocaleString()
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-400">
                          {r.total_reps ?? 0}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Total Reps</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🥊</div>
                <p className="text-gray-400 text-lg">No recent sessions</p>
                <p className="text-gray-500 text-sm mt-2">
                  Start your first training session to see your progress here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------- Components ------------------------- */
function UserBadge({
  userName,
  avatarUrl,
  onSignOut,
}: {
  userName: string | null;
  avatarUrl: string | null;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-300">{userName}</span>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold overflow-hidden ring-2 ring-white/20">
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
      <button
        onClick={onSignOut}
        className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-sm hover:bg-white/20"
      >
        Sign out
      </button>
    </div>
  );
}
