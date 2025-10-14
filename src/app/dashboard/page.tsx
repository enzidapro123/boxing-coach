"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type ProgressRow = {
  user_id: string;
  technique: string;
  accuracy: number | null;
  duration: number | null; // minutes (optional)
  created_at: string; // timestamptz
};

type SessionRow = {
  user_id: string;
  technique: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  score: number | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [stats, setStats] = useState({
    accuracy: 0,
    sessions: 0,
    totalTime: "0h",
    techniquesMastered: 0,
    mostPracticed: "-",
  });

  const [recent, setRecent] = useState<
    { technique: string; created_at: string; accuracy: number | null }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setErr(null);
        setLoading(true);

        // 1) Require auth
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        // 2) Profile
        const { data: profile, error: profileErr } = await supabase
          .from("users")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) throw profileErr;
        if (cancelled) return;

        setUserName((profile?.username ?? user.email) || user.email || "User");
        setAvatarUrl(profile?.avatar_url || null);

        // 3) Data
        const [progRes, sessRes] = await Promise.all([
          supabase
            .from("progress")
            .select("technique, accuracy, created_at, duration, user_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("sessions")
            .select(
              "technique, started_at, ended_at, duration_seconds, score, user_id"
            )
            .eq("user_id", user.id)
            .order("started_at", { ascending: false }),
        ]);

        const progress: ProgressRow[] = Array.isArray(progRes.data)
          ? progRes.data
          : [];
        const sessions: SessionRow[] = Array.isArray(sessRes.data)
          ? sessRes.data
          : [];

        // ----- Build stats -----
        const totalSessions = sessions.length || progress.length;

        const accSamples: number[] = [];
        if (progress.length) {
          for (const r of progress)
            if (typeof r.accuracy === "number") accSamples.push(r.accuracy);
        } else if (sessions.length) {
          for (const r of sessions)
            if (typeof r.score === "number") accSamples.push(r.score as number);
        }
        const avgAccuracy = accSamples.length
          ? Math.round(
              accSamples.reduce((a, b) => a + b, 0) / accSamples.length
            )
          : 0;

        let totalSeconds = 0;
        if (sessions.length) {
          for (const s of sessions) {
            if (typeof s.duration_seconds === "number") {
              totalSeconds += s.duration_seconds!;
            } else if (s.started_at && s.ended_at) {
              const sec =
                (new Date(s.ended_at).getTime() -
                  new Date(s.started_at).getTime()) /
                1000;
              if (sec > 0) totalSeconds += sec;
            }
          }
        } else if (progress.length) {
          const mins = progress.reduce((sum, r) => sum + (r.duration || 0), 0);
          totalSeconds = mins * 60;
        }
        const totalHours = (totalSeconds / 3600).toFixed(1);

        const masteredSet = new Set<string>();
        const sourceForMastery = progress.length ? progress : sessions;
        for (const r of sourceForMastery) {
          const acc = (r as any).accuracy ?? (r as any).score ?? null;
          if (typeof acc === "number" && acc >= 85) {
            masteredSet.add((r as any).technique);
          }
        }

        const counts: Record<string, number> = {};
        const sourceForCounts = sessions.length ? sessions : progress;
        for (const r of sourceForCounts) {
          const t = (r as any).technique || "-";
          counts[t] = (counts[t] || 0) + 1;
        }
        const mostPracticed =
          Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

        const recentUnified: {
          technique: string;
          created_at: string;
          accuracy: number | null;
        }[] = [];
        for (const p of progress) {
          recentUnified.push({
            technique: p.technique,
            created_at: p.created_at,
            accuracy: p.accuracy ?? null,
          });
        }
        for (const s of sessions) {
          recentUnified.push({
            technique: s.technique,
            created_at: s.started_at || s.ended_at || new Date().toISOString(),
            accuracy: s.score ?? null,
          });
        }
        recentUnified.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        if (cancelled) return;

        setStats({
          accuracy: avgAccuracy,
          sessions: totalSessions,
          totalTime: `${totalHours}h`,
          techniquesMastered: masteredSet.size,
          mostPracticed,
        });
        setRecent(recentUnified.slice(0, 5));
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    // Keep page in sync if auth changes in another tab
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
      if (event === "SIGNED_IN") router.replace("/dashboard");
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [router]);

  const iconFor = (raw: string) => {
    const t = (raw || "").toLowerCase();
    if (t === "jab") return "👊";
    if (t === "cross") return "💥";
    if (t === "hook") return "🌟";
    if (t === "uppercut") return "⚡";
    if (t === "guard") return "🛡️";
    return "🥊";
  };

  const pretty = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

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
        <section className="mb-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-clip-text text-transparent">
              {userName}
            </span>{" "}
          </h2>
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

            {recent.length > 0 ? (
              <div className="space-y-4">
                {recent.map((session, i) => (
                  <div
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
                      </div>

                      <div className="text-right">
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-3"></div>
                <p className="text-neutral-700 text-lg">No recent sessions</p>
                <p className="text-neutral-500 text-sm mt-1">
                  Start your first training session to see progress here.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
