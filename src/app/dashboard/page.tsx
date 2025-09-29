"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type ProgressRow = {
  user_id: string;
  technique: string;
  accuracy: number | null;
  duration: number | null; // minutes (optional)
  created_at: string;      // timestamptz
};

type SessionRow = {
  user_id: string;
  technique: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null; // optional
  score: number | null;            // optional accuracy
};

export default function Homepage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Profile
      const { data: profile } = await supabase
        .from("users")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(profile?.username || user.email);
      setAvatarUrl(profile?.avatar_url || null);

      // Fetch progress + sessions (both optional)
      const [progRes, sessRes] = await Promise.all([
        supabase
          .from("progress")
          .select("technique, accuracy, created_at, duration, user_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("sessions")
          .select("technique, started_at, ended_at, duration_seconds, score, user_id")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false }),
      ]);

      const progress: ProgressRow[] = Array.isArray(progRes.data) ? progRes.data : [];
      const sessions: SessionRow[] = Array.isArray(sessRes.data) ? sessRes.data : [];

      // ----- Build stats -----

      // Session count: prefer sessions table; fallback to progress length
      const totalSessions = sessions.length || progress.length;

      // Accuracy: prefer progress.accuracy; fallback to sessions.score
      const accSamples: number[] = [];
      if (progress.length) {
        for (const r of progress) if (typeof r.accuracy === "number") accSamples.push(r.accuracy);
      } else if (sessions.length) {
        for (const r of sessions) if (typeof r.score === "number") accSamples.push(r.score as number);
      }
      const avgAccuracy = accSamples.length
        ? Math.round(accSamples.reduce((a, b) => a + b, 0) / accSamples.length)
        : 0;

      // Total time:
      // 1) sessions.duration_seconds
      // 2) else sessions ended-started
      // 3) else progress.duration (minutes)
      let totalSeconds = 0;
      if (sessions.length) {
        for (const s of sessions) {
          if (typeof s.duration_seconds === "number") {
            totalSeconds += s.duration_seconds!;
          } else if (s.started_at && s.ended_at) {
            const sec =
              (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000;
            if (sec > 0) totalSeconds += sec;
          }
        }
      } else if (progress.length) {
        const mins = progress.reduce((sum, r) => sum + (r.duration || 0), 0);
        totalSeconds = mins * 60;
      }
      const totalHours = (totalSeconds / 3600).toFixed(1);

      // Techniques mastered: accuracy >= 85
      const masteredSet = new Set<string>();
      const sourceForMastery = progress.length ? progress : sessions;
      for (const r of sourceForMastery) {
        const acc =
          (r as any).accuracy ?? (r as any).score ?? null;
        if (typeof acc === "number" && acc >= 85) {
          masteredSet.add((r as any).technique);
        }
      }

      // Most practiced technique: prefer sessions; fallback to progress
      const counts: Record<string, number> = {};
      const sourceForCounts = sessions.length ? sessions : progress;
      for (const r of sourceForCounts) {
        const t = (r as any).technique || "-";
        counts[t] = (counts[t] || 0) + 1;
      }
      const mostPracticed =
        Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

      // Recent (last 5 combined)
      const recentUnified: { technique: string; created_at: string; accuracy: number | null }[] = [];
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
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setStats({
        accuracy: avgAccuracy,
        sessions: totalSessions,
        totalTime: `${totalHours}h`,
        techniquesMastered: masteredSet.size,
        mostPracticed,
      });
      setRecent(recentUnified.slice(0, 5));
    })();
  }, []);

  const iconFor = (raw: string) => {
    const t = (raw || "").toLowerCase();
    if (t === "jab") return "👊";
    if (t === "cross") return "💥";
    if (t === "hook") return "🌟";
    if (t === "uppercut") return "⚡";
    if (t === "guard") return "🛡️";
    return "🥊";
  };

  const pretty = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Navbar */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">🥊</div>
            <h1 className="text-xl font-bold text-white">BlazePose Coach</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">{userName}</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold overflow-hidden ring-2 ring-white/20">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{userName ? userName.charAt(0).toUpperCase() : "U"}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome */}
        <section className="mb-10">
          <h2 className="text-4xl font-bold text-white mb-2">
            Welcome back, {userName} 👊
          </h2>
          <p className="text-gray-400 text-lg">Here's an overview of your training performance.</p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
            <h3 className="text-sm text-gray-400 mb-2">Sessions Completed</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">
              {stats.sessions}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
            <h3 className="text-sm text-gray-400 mb-2">Total Training Time</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
              {stats.totalTime}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
            <h3 className="text-sm text-gray-400 mb-2">Average Accuracy</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent">
              {stats.accuracy}%
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
            <h3 className="text-sm text-gray-400 mb-2">Techniques Mastered</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
              {stats.techniquesMastered}
            </p>
          </div>
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
            <div className="flex flex-col gap-4">
              <a href="/training" className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-4 rounded-xl text-center font-semibold transition-all transform hover:scale-105 shadow-lg">
                🎯 Start Training
              </a>
              <a href="/history" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-4 rounded-xl text-center font-semibold transition-all">
                📊 View History
              </a>
              <a href="/profile" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-4 rounded-xl text-center font-semibold transition-all">
                ⚙️ Profile Settings
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <h4 className="text-sm text-gray-400 mb-2">Most Practiced</h4>
              <p className="text-2xl font-bold text-white">{pretty(stats.mostPracticed)}</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>

            {recent.length > 0 ? (
              <div className="space-y-4">
                {recent.map((session, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{iconFor(session.technique)}</span>
                          <h4 className="text-lg font-semibold text-white">
                            {pretty(session.technique)}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-400">
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
                                  ? "text-green-400"
                                  : session.accuracy >= 70
                                  ? "text-yellow-400"
                                  : "text-red-400"
                              }`}
                            >
                              {session.accuracy}%
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Accuracy</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">No accuracy recorded</p>
                        )}
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
                  Start your first training session to see your progress here
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
