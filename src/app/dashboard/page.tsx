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

        // Fetch recent sessions
        const { data, error } = await supabase
          .from("training_sessions")
          .select(
            "id, user_id, technique, started_at, finished_at, duration_sec, total_reps"
          )
          .eq("user_id", user?.id)
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
      <div className="min-h-screen grid place-items-center bg-neutral-50 text-neutral-900">
        Loading dashboard…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-neutral-50 text-neutral-900">
        <div className="bg-white/80 backdrop-blur-xl border border-red-100 p-6 rounded-2xl shadow-xl">
          <div className="font-semibold mb-2">Error</div>
          <div className="text-sm text-neutral-600">{err}</div>
          <div className="mt-4">
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition"
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* soft glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/25 to-orange-400/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-3 hover:opacity-90 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 grid place-items-center text-white text-lg shadow-lg shadow-red-500/30">
              🥊
            </div>
            <h1 className="text-xl font-bold">BlazePose Coach</h1>
          </a>

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
        {/* Welcome */}
        <section className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2 text-xs font-semibold text-red-700 mb-4">
            Dashboard
          </div>
          <h2 className="text-4xl font-bold mb-2">
            Welcome back, {userName} 👊
          </h2>
          <p className="text-neutral-600">
            Here’s an overview of your recent training sessions.
          </p>
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-300/30 to-orange-300/30 blur-3xl" />
            <div className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-8 shadow-2xl shadow-red-500/10">
              <h3 className="text-xl font-semibold mb-6">Quick actions</h3>
              <div className="flex flex-col gap-4">
                <a
                  href="/training"
                  className="rounded-xl text-center font-semibold px-6 py-4 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-500/30 hover:scale-[1.02] transition"
                >
                  🎯 Start Training
                </a>
                <a
                  href="/progress"
                  className="rounded-xl text-center font-semibold px-6 py-4 border border-neutral-200 bg-white hover:bg-neutral-50 transition"
                >
                  📊 View progress
                </a>
                <a
                  href="/profile"
                  className="rounded-xl text-center font-semibold px-6 py-4 border border-neutral-200 bg-white hover:bg-neutral-50 transition"
                >
                  ⚙️ Profile Settings
                </a>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-300/25 to-red-300/25 blur-3xl" />
            <div className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-8 shadow-2xl shadow-red-500/10">
              <h3 className="text-xl font-semibold mb-6">Recent activity</h3>

              {recent.length > 0 ? (
                <div className="space-y-4">
                  {recent.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-neutral-200 bg-white/70 p-5 hover:bg-white transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {iconFor(r.technique)}
                          </span>
                          <div>
                            <div className="font-semibold text-lg">
                              {pretty(r.technique)}
                            </div>
                            <p className="text-sm text-neutral-600">
                              {r.started_at
                                ? new Date(r.started_at).toLocaleString()
                                : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold bg-gradient-to-r from-neutral-900 to-blue-500 bg-clip-text text-transparent">
                            {r.total_reps ?? 0}
                          </div>
                          <p className="text-xs text-neutral-600 mt-1">
                            Total reps
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🥊</div>
                  <p className="text-neutral-700 text-lg">No recent sessions</p>
                  <p className="text-neutral-500 text-sm mt-2">
                    Start your first training session to see your progress here.
                  </p>
                </div>
              )}
            </div>
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
      <span className="text-sm text-neutral-600">{userName}</span>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white flex items-center justify-center font-bold overflow-hidden ring-2 ring-red-200/60">
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
        onClick={onSignOut}
        className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-sm transition"
      >
        Sign out
      </button>
    </div>
  );
}
