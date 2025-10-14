// app/it_admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

/* ----------------------------- Row types ----------------------------- */
type S30 = {
  id: string;
  user_id: string | null;
  username: string | null;
  email: string | null;
  technique: string;
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  total_reps: number | null;
};
type D30 = { day: string; sessions: number; reps: number; avg_duration_sec: number | null };
type TopUser = { user_id: string | null; display_name: string; sessions: number; reps: number };
type Mix = { technique: string; sessions: number; reps: number };
type Recent = {
  id: string;
  user_id: string | null;
  display_name: string;
  technique: string;
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  total_reps: number | null;
};

export default function ItAdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sessions30, setSessions30] = useState<S30[]>([]);
  const [daily30, setDaily30] = useState<D30[]>([]);
  const [topUsers30, setTopUsers30] = useState<TopUser[]>([]);
  const [mix30, setMix30] = useState<Mix[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Gate: must be it_admin or super_admin
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return router.replace("/login");

        const { data: me, error: meErr } = await supabase
          .from("users")
          .select("user_role")
          .eq("id", uid)
          .maybeSingle();
        if (meErr) throw meErr;
        if (!me || !["it_admin", "super_admin"].includes(me.user_role)) {
          return router.replace("/");
        }

        // Load all admin views + total users count
        const [s30, d30, tu30, m30, rs, usersCount] = await Promise.all([
          supabase.from("v_admin_sessions_30d").select("*"),
          supabase.from("v_admin_daily_sessions_30d").select("*"),
          supabase.from("v_admin_top_users_30d").select("*").limit(10),
          supabase.from("v_admin_technique_mix_30d").select("*"),
          supabase.from("v_admin_recent_sessions").select("*"),
          supabase.from("users").select("id", { count: "exact", head: true }),
        ]);

        if (s30.error) throw s30.error;
        if (d30.error) throw d30.error;
        if (tu30.error) throw tu30.error;
        if (m30.error) throw m30.error;
        if (rs.error) throw rs.error;

        setSessions30((s30.data ?? []) as S30[]);
        setDaily30((d30.data ?? []) as D30[]);
        setTopUsers30((tu30.data ?? []) as TopUser[]);
        setMix30((m30.data ?? []) as Mix[]);
        setRecent((rs.data ?? []) as Recent[]);
        setTotalUsers(usersCount.count ?? 0);
      } catch (e: any) {
        setErr(e.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  /* --------------------------- KPIs (30d) --------------------------- */
  const kpi = useMemo(() => {
    const sessions = sessions30.length;
    const uniqueUsersActive30d = new Set(
      sessions30.map((s) => s.user_id).filter(Boolean)
    ).size;
    const reps = sessions30.reduce((a, b) => a + (b.total_reps ?? 0), 0);
    const avgDur = sessions
      ? Math.round(
          sessions30.reduce((a, b) => a + (b.duration_sec ?? 0), 0) / sessions
        )
      : 0;
    return { sessions, uniqueUsersActive30d, reps, avgDur };
  }, [sessions30]);

  /* ------------------------------ UI ------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white text-neutral-900">
        <div className="rounded-2xl border border-neutral-200/80 bg-white/80 backdrop-blur-xl px-6 py-4 shadow-xl">
          Loading admin…
        </div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white text-neutral-900">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 shadow">
          {err}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* Soft background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/30 to-orange-400/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

 <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
  <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    {/* Left group: logo + title */}
    <div className="flex items-center gap-3">
      <a href="/" className="flex items-center hover:opacity-80 transition">
        <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
      </a>

      <div className="flex flex-col leading-tight">
        <h1 className="text-xl font-bold">IT Admin</h1>
        <p className="text-xs text-neutral-600">Last 30 days</p>
      </div>
    </div>

    {/* Right button */}
    <a
      href="/dashboard"
      className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 transition"
    >
      Back to app
    </a>
  </div>
</header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Kpi title="Total users (all-time)" value={totalUsers} accent="from-red-600 to-orange-500" />
          <Kpi title="Active users (30d)" value={kpi.uniqueUsersActive30d} accent="from-orange-600 to-red-500" />
          <Kpi title="Sessions (30d)" value={kpi.sessions} accent="from-rose-500 to-orange-500" />
          <Kpi title="Total reps (30d)" value={kpi.reps} accent="from-fuchsia-500 to-pink-500" />
          <Kpi title="Avg duration (s)" value={kpi.avgDur} accent="from-amber-500 to-red-500" />
        </section>

        {/* Technique mix (30d) */}
        <Card title="Technique mix (30d)">
          <Table
            head={["Technique", "Sessions", "Reps"]}
            rows={mix30.map((r) => [
              <span className="capitalize" key="t">{r.technique}</span>,
              <Right key="s">{r.sessions}</Right>,
              <Right key="r">{r.reps}</Right>,
            ])}
            empty="No data"
          />
        </Card>

        {/* Top users (30d) */}
        <Card title="Top users (30d) — by sessions">
          <Table
            head={["User", "Sessions", "Reps"]}
            rows={topUsers30.map((u) => [
              <span key="u" className="truncate max-w-[220px] inline-block align-middle">{u.display_name}</span>,
              <Right key="s">{u.sessions}</Right>,
              <Right key="r">{u.reps}</Right>,
            ])}
            empty="No data"
          />
        </Card>

        {/* Recent sessions (global last 100) */}
        <Card title="Recent sessions (last 100 overall)">
          <Table
            head={["Started", "User", "Technique", "Reps", "Duration (s)"]}
            rows={recent.map((r) => [
              r.started_at ? new Date(r.started_at).toLocaleString() : "—",
              <span key="u" className="truncate max-w-[220px] inline-block align-middle">{r.display_name}</span>,
              <span className="capitalize" key="t">{r.technique}</span>,
              <Right key="reps">{r.total_reps ?? 0}</Right>,
              <Right key="dur">{r.duration_sec ?? 0}</Right>,
            ])}
            empty="No data"
          />
        </Card>

        {/* daily30 is loaded and ready if you add a chart later */}
      </main>
    </div>
  );
}

/* ------------------------------ UI bits ------------------------------ */
function Kpi({
  title,
  value,
  accent = "from-red-600 to-orange-500",
}: {
  title: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/85 backdrop-blur-xl p-4 shadow-sm">
      <div className={`absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <div className="text-xs font-medium text-neutral-600">{title}</div>
      <div className="mt-1 text-3xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-red-100/80 bg-white/85 backdrop-blur-xl shadow-2xl shadow-red-500/10">
      <div className="absolute -inset-10 bg-gradient-to-br from-red-300/20 to-orange-300/20 opacity-60 blur-3xl" />
      <div className="relative border-b border-neutral-200/70 px-5 py-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-3 py-1 text-xs font-semibold text-red-700">
          {title}
        </div>
      </div>
      <div className="relative p-5">{children}</div>
    </section>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: (string | React.ReactNode)[];
  rows: (React.ReactNode[])[];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 text-neutral-600">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.length ? (
            rows.map((cells, i) => (
              <tr key={i} className="hover:bg-neutral-50/80 transition-colors">
                {cells.map((c, j) => (
                  <td key={j} className="px-4 py-3 align-top text-neutral-800">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={head.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Right({ children }: { children: React.ReactNode }) {
  return <span className="float-right font-semibold">{children}</span>;
}
