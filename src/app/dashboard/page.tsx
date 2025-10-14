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
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white text-neutral-900">
        <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-xl px-6 py-4 shadow-md">
          Loading dashboard…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white text-neutral-900">
        <div className="bg-white/80 backdrop-blur-xl border border-red-200 rounded-2xl p-6 shadow-lg">
          <div className="font-semibold text-red-700 mb-2">Error</div>
          <div className="text-sm text-neutral-700">{err}</div>
          <div className="mt-4">
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 rounded-full border-2 border-neutral-200 bg-white text-neutral-900 hover:border-red-200 hover:bg-red-50 transition"
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
<<<<<<< HEAD
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
          <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
            <span className="sr-only">BlazePose Coach</span>
          </a>

          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600">{userName}</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center font-bold overflow-hidden ring-2 ring-red-200/50">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
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
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
              className="px-3 py-1.5 rounded-full border-2 border-neutral-200 bg-white text-sm text-neutral-900 hover:border-red-200 hover:bg-red-50 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Welcome */}
=======
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
>>>>>>> 274c41e (Updated dashboard and added progress folder)
        <section className="mb-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent">
              {userName}
            </span>{" "}
          </h2>
<<<<<<< HEAD
          <p className="text-neutral-600 text-lg">
            Here’s an overview of your training performance.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Sessions Completed", value: stats.sessions, tone: "from-red-600 to-orange-500" },
            { label: "Total Training Time", value: stats.totalTime, tone: "from-orange-600 to-red-500" },
            { label: "Average Accuracy", value: `${stats.accuracy}%`, tone: "from-emerald-600 to-teal-500" },
            { label: "Techniques Mastered", value: stats.techniquesMastered, tone: "from-purple-600 to-pink-500" },
          ].map((s) => (
            <div
              key={s.label}
              className="group relative rounded-2xl border border-red-100/70 bg-white/80 backdrop-blur p-6 shadow-sm hover:shadow-md transition"
            >
              <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${s.tone} opacity-0 group-hover:opacity-10 transition`} />
              <h3 className="relative text-sm text-neutral-500 mb-2">{s.label}</h3>
              <p className="relative text-4xl font-bold bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent">
                {s.value}
              </p>
            </div>
          ))}
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="rounded-3xl border border-red-100/70 bg-white/80 backdrop-blur p-8 shadow-sm">
            <h3 className="text-xl font-semibold mb-6">Quick actions</h3>
=======
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
>>>>>>> 274c41e (Updated dashboard and added progress folder)
            <div className="flex flex-col gap-4">
              <a
                href="/training"
                className="rounded-full text-center font-semibold px-6 py-4 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md transition hover:scale-105"
              >
                Start training
              </a>
              <a
                href="/history"
                className="rounded-full text-center font-semibold px-6 py-4 border-2 border-neutral-200 bg-white text-neutral-900 hover:border-red-200 hover:bg-red-50 transition"
              >
                View history
              </a>
              <a
                href="/profile"
                className="rounded-full text-center font-semibold px-6 py-4 border-2 border-neutral-200 bg-white text-neutral-900 hover:border-red-200 hover:bg-red-50 transition"
              >
                Profile settings
              </a>
            </div>
<<<<<<< HEAD

            <div className="mt-8 pt-6 border-t border-neutral-200/60">
              <h4 className="text-sm text-neutral-500 mb-1">Most practiced</h4>
              <p className="text-2xl font-bold">
                {stats.mostPracticed ? pretty(stats.mostPracticed) : "-"}
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 rounded-3xl border border-red-100/70 bg-white/80 backdrop-blur p-8 shadow-sm">
            <h3 className="text-xl font-semibold mb-6">Recent activity</h3>
=======
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6">
              Recent Activity
            </h3>
>>>>>>> 274c41e (Updated dashboard and added progress folder)

            {recent.length > 0 ? (
              <div className="space-y-4">
                {recent.map((r) => (
                  <div
<<<<<<< HEAD
                    key={i}
                    className="rounded-2xl border border-neutral-200 bg-white/70 p-5 hover:border-red-200 hover:bg-red-50/50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-2xl">{iconFor(session.technique)}</span>
                          <h4 className="text-lg font-semibold">
                            {pretty(session.technique)}
                          </h4>
                        </div>
                        <p className="text-sm text-neutral-500">
                          {new Date(session.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
=======
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
>>>>>>> 274c41e (Updated dashboard and added progress folder)
                      </div>

                      <div className="text-right">
<<<<<<< HEAD
                        {typeof session.accuracy === "number" ? (
                          <>
                            <div
                              className={`text-3xl font-bold ${
                                session.accuracy >= 85
                                  ? "text-emerald-600"
                                  : session.accuracy >= 70
                                  ? "text-amber-600"
                                  : "text-red-600"
                              }`}
                            >
                              {session.accuracy}%
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                              Accuracy
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-neutral-500">
                            No accuracy recorded
                          </p>
                        )}
=======
                        <div className="text-3xl font-bold text-blue-400">
                          {r.total_reps ?? 0}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Total Reps</p>
>>>>>>> 274c41e (Updated dashboard and added progress folder)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
<<<<<<< HEAD
                <div className="text-6xl mb-3"></div>
                <p className="text-neutral-700 text-lg">No recent sessions</p>
                <p className="text-neutral-500 text-sm mt-1">
                  Start your first training session to see progress here.
=======
                <div className="text-6xl mb-4">🥊</div>
                <p className="text-gray-400 text-lg">No recent sessions</p>
                <p className="text-gray-500 text-sm mt-2">
                  Start your first training session to see your progress here.
>>>>>>> 274c41e (Updated dashboard and added progress folder)
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
