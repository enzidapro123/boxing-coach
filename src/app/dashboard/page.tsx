"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    const getUserAndStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      setUserName(profile?.username || user.email);
      setAvatarUrl(profile?.avatar_url || null);

      // ✅ fetch stats
      const { data } = await supabase
        .from("progress")
        .select("technique, accuracy, created_at, duration")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) return;

      // Calculate stats
      const totalSessions = data.length;
      const avgAccuracy =
        data.reduce((sum, s) => sum + (s.accuracy || 0), 0) / totalSessions;

      // Calculate total time (assuming duration is in minutes)
      const totalMinutes = data.reduce((sum, s) => sum + (s.duration || 0), 0);
      const totalHours = (totalMinutes / 60).toFixed(1);

      // Count techniques mastered (accuracy >= 85%)
      const masteredTechniques = new Set(
        data.filter((s) => s.accuracy >= 85).map((s) => s.technique)
      ).size;

      // Find most practiced technique
      const counts: Record<string, number> = {};
      data.forEach((s) => {
        counts[s.technique] = (counts[s.technique] || 0) + 1;
      });
      const mostPracticed = Object.entries(counts).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "-";

      setStats({
        accuracy: Math.round(avgAccuracy),
        sessions: totalSessions,
        totalTime: `${totalHours}h`,
        techniquesMastered: masteredTechniques,
        mostPracticed,
      });

      // ✅ last 5 sessions
      setRecent(data.slice(0, 5));
    };

    getUserAndStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Navbar */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">
              🥊
            </div>
            <h1 className="text-xl font-bold text-white">BlazePose Coach</h1>
          </div>
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <section className="mb-10">
          <h2 className="text-4xl font-bold text-white mb-2">
            Welcome back, {userName} 👊
          </h2>
          <p className="text-gray-400 text-lg">
            Here's an overview of your training performance.
          </p>
        </section>

        {/* Stats Grid */}
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

        {/* Main Content Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions - Takes 1 column */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6">Quick Actions</h3>
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

            {/* Most Practiced */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <h4 className="text-sm text-gray-400 mb-2">Most Practiced</h4>
              <p className="text-2xl font-bold text-white">{stats.mostPracticed}</p>
            </div>
          </div>

          {/* Recent Activity - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>
            
            {recent.length > 0 ? (
              <div className="space-y-4">
                {recent.map((session, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {session.technique === "Jab" ? "👊" : 
                             session.technique === "Cross" ? "💥" :
                             session.technique === "Hook" ? "🌟" :
                             session.technique === "Uppercut" ? "⚡" : "🥊"}
                          </span>
                          <h4 className="text-lg font-semibold text-white">
                            {session.technique}
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
                        <div className={`text-3xl font-bold ${
                          session.accuracy >= 85 ? "text-green-400" :
                          session.accuracy >= 70 ? "text-yellow-400" :
                          "text-red-400"
                        }`}>
                          {session.accuracy}%
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Accuracy</p>
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