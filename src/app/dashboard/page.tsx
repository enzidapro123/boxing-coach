"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";
import { audit } from "@/app/lib/audit";

/* ----------------------------- Types ----------------------------- */
type Role = "regular" | "it_admin" | "super_admin";

type RecentViewRow = {
  user_id: string;
  session_id: string;
  technique: string;
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  total_reps: number | null;
};

type ProgressViewRow = {
  user_id: string;
  technique: string;
  day: string; // yyyy-mm-dd
  reps: number;
};

type MostTrainedViewRow = {
  user_id: string;
  technique: string;
  reps_30d: number;
};

/** DB row shapes (to avoid `any` in mappings) */
type DBProgressRow = {
  user_id: string;
  technique: string;
  day: string | Date;
  reps: number | null;
};

type DBSessionRow = {
  id: string;
  started_at: string;
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

/** Return UTC yyyy-mm-dd for any Date/string (kept for your existing views) */
function dateKeyUTC(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Date(
    Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
}

/** Local yyyy-mm-dd for streak calculation (sessions per local day) */
function dateKeyLocal(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const day = dt.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${y}-${pad(m)}-${pad(day)}`;
}

/** Streak = consecutive LOCAL days including today that have ≥1 session */
function computeLocalStreakFromSessions(sessionDates: string[]): number {
  const set = new Set(sessionDates.map(dateKeyLocal));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKeyLocal(d);
    if (set.has(key)) streak++;
    else break;
  }
  return streak;
}

/* --------------------------- Component --------------------------- */
export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("regular");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [recent, setRecent] = useState<RecentViewRow[]>([]);
  const [_progress30, setProgress30] = useState<ProgressViewRow[]>([]); // intentionally unused in UI
  const [mostTrained, setMostTrained] = useState<MostTrainedViewRow | null>(
    null
  );

  // sessions for KPI (30d)
  const [sessions30, setSessions30] = useState<DBSessionRow[]>([]);

  // sessions for streak (local-day computation; last 120d)
  const [sessionsForStreak, setSessionsForStreak] = useState<DBSessionRow[]>(
    []
  );

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

        // profile + role (add user_role to the select)
        const { data: profile, error: profileErr } = await supabase
          .from("users")
          .select("username, avatar_url, user_role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) throw profileErr;

        if (!cancelled) {
          setUserName(profile?.username ?? user.email ?? "User");
          setAvatarUrl(profile?.avatar_url ?? null);
          setRole((profile?.user_role as Role) ?? "regular");
        }

        // ranges
        const since30 = new Date();
        since30.setDate(since30.getDate() - 30);

        const since120 = new Date();
        since120.setDate(since120.getDate() - 120);

        const [recentRes, progRes, mostRes, sessRes, streakSessRes] =
          await Promise.all([
            supabase
              .from("v_user_recent_sessions")
              .select("*")
              .eq("user_id", user.id)
              .order("started_at", { ascending: false })
              .limit(5),

            supabase
              .from("v_user_progress_30d")
              .select("*")
              .eq("user_id", user.id)
              .order("day", { ascending: true }),

            supabase
              .from("v_user_most_trained_30d")
              .select("*")
              .eq("user_id", user.id)
              .order("reps_30d", { ascending: false })
              .limit(1),

            supabase
              .from("training_sessions")
              .select("id, started_at")
              .eq("user_id", user.id)
              .gte("started_at", since30.toISOString())
              .order("started_at", { ascending: true }),

            supabase
              .from("training_sessions")
              .select("id, started_at")
              .eq("user_id", user.id)
              .gte("started_at", since120.toISOString())
              .order("started_at", { ascending: true }),
          ]);

        if (recentRes.error) throw recentRes.error;
        if (progRes.error) throw progRes.error;
        if (mostRes.error) throw mostRes.error;
        if (sessRes.error) throw sessRes.error;
        if (streakSessRes.error) throw streakSessRes.error;

        const rec = (recentRes.data ?? []) as RecentViewRow[];

        const prog = ((progRes.data ?? []) as DBProgressRow[]).map((r) => ({
          user_id: r.user_id,
          technique: r.technique,
          day: typeof r.day === "string" ? r.day : dateKeyUTC(r.day),
          reps: r.reps ?? 0,
        })) as ProgressViewRow[];

        const mt =
          mostRes.data && mostRes.data.length > 0
            ? (mostRes.data[0] as MostTrainedViewRow)
            : null;

        const sess = ((sessRes.data ?? []) as DBSessionRow[]).map((s) => ({
          id: s.id,
          started_at: s.started_at,
        }));

        const streakSess = ((streakSessRes.data ?? []) as DBSessionRow[]).map(
          (s) => ({
            id: s.id,
            started_at: s.started_at,
          })
        );

        if (!cancelled) {
          setRecent(rec);
          setProgress30(prog);
          setMostTrained(mt);
          setSessions30(sess);
          setSessionsForStreak(streakSess);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : "Error loading dashboard";
          setErr(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /* --------------- Derived metrics --------------- */
  const streak = useMemo(
    () =>
      computeLocalStreakFromSessions(
        sessionsForStreak.map((s) => s.started_at).filter(Boolean) as string[]
      ),
    [sessionsForStreak]
  );

  const sessions30Count = sessions30.length;

  /* ----------------------------- UI ----------------------------- */
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
              onClick={() => location.reload()}
              className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition"
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
      {/* soft glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/25 to-orange-400/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition"
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

          <UserBadge
            userName={userName}
            avatarUrl={avatarUrl}
            onSignOut={async () => {
              await audit("auth.logout", {});
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
          <h2 className="text-4xl font-bold mb-2">Welcome , {userName} 👊</h2>
          <p className="text-neutral-600">
            Here’s an overview of your recent training and progress.
          </p>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <KpiCard title="Current Streak" value={`${streak}`} icon="🔥" />
          <KpiCard
            title="Training Sessions (30d)"
            value={sessions30Count}
            icon="📅"
          />
          <KpiCard
            title="Most Trained (30d)"
            value={
              mostTrained
                ? `${pretty(mostTrained.technique)} · ${
                    mostTrained.reps_30d
                  } reps`
                : "—"
            }
            icon={mostTrained ? iconFor(mostTrained.technique) : "🥊"}
          />
        </section>

        {/* Quick Actions + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-300/30 to-orange-300/30 blur-3xl" />
            <div className="relative rounded-3xl border border-red-100/80 bg-white/80 backdrop-blur-xl p-8 shadow-2xl shadow-red-500/10">
              <h3 className="text-xl font-semibold mb-6">Quick actions</h3>
              <div className="flex flex-col gap-4">
                <Link
                  href="/training"
                  className="rounded-xl text-center font-semibold px-6 py-4 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-500/30 hover:scale-[1.02] transition"
                >
                  🎯 Start Training
                </Link>
                <Link
                  href="/progress"
                  className="rounded-xl text-center font-semibold px-6 py-4 border border-neutral-200 bg-white hover:bg-neutral-50 transition"
                >
                  📊 View progress
                </Link>
                <Link
                  href="/profile"
                  className="rounded-xl text-center font-semibold px-6 py-4 border border-neutral-200 bg-white hover:bg-neutral-50 transition"
                >
                  ⚙️ Profile Settings
                </Link>

                {/* Admin-only quick links */}
                {(role === "it_admin" || role === "super_admin") && (
                  <Link
                    href="/it_admin"
                    className="rounded-xl text-center font-semibold px-6 py-4 border border-neutral-200 bg-white hover:bg-neutral-50 transition"
                  >
                    🛠 IT Admin
                  </Link>
                )}
                {role === "super_admin" && (
                  <Link
                    href="/super_admin"
                    className="rounded-xl text-center font-semibold px-6 py-4 border border-neutral-200 bg-white hover:bg-neutral-50 transition"
                  >
                    👑 Super Admin
                  </Link>
                )}
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
                      key={r.session_id}
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
                            Total reps{r.technique === "guard" ? " (secs)" : ""}
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
  const letter = userName ? userName.charAt(0).toUpperCase() : "U";
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-neutral-600">{userName}</span>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white flex items-center justify-center font-bold overflow-hidden ring-2 ring-red-200/60">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Profile"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{letter}</span>
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

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon?: string;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white/80 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-600">{title}</h3>
        <div className="text-xl">{icon ?? "📈"}</div>
      </div>
      <div className="mt-3 text-3xl font-extrabold">{value}</div>
    </div>
  );
}
