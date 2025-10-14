// app/super_admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

/* ---------------- Types ---------------- */
type Role = "regular" | "it_admin" | "super_admin";
type UserRow = { id: string; email: string | null; created_at: string | null; username: string | null; user_role: Role };
type SessionRow = {
  id: string;
  user_id: string | null;
  technique: string;
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  total_reps: number | null;
  username: string | null;
  email: string | null;
};
type Mix = { technique: string; sessions: number; reps: number };

/* ---------------- Page ---------------- */
export default function SuperAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [tab, setTab] = useState<"users" | "sessions" | "reports">("users");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: au } = await supabase.auth.getUser();
      const uid = au.user?.id;
      if (!uid) return router.replace("/login");
      const { data, error } = await supabase.from("users").select("user_role").eq("id", uid).maybeSingle();
      if (error) return router.replace("/");
      const allowed = data?.user_role === "super_admin";
      setOk(!!allowed);
      setLoading(false);
      if (!allowed) router.replace("/");
    })();
  }, [router]);

  if (loading) return <ScreenLoading />;
  if (!ok) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900">
      {/* Glassy header (consistent with IT Admin) */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center hover:opacity-80 transition">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
            </a>
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl font-bold">Super Admin</h1>
              <p className="text-xs text-neutral-600">Organization controls</p>
            </div>
          </div>

          <nav className="flex gap-2">
            <Tab label="Users" active={tab === "users"} onClick={() => setTab("users")} />
            <Tab label="Sessions" active={tab === "sessions"} onClick={() => setTab("sessions")} />
            <Tab label="Reports" active={tab === "reports"} onClick={() => setTab("reports")} />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {tab === "users" && <UsersPanel />}
        {tab === "sessions" && <SessionsPanel />}
        {tab === "reports" && <ReportsPanel />}
      </main>
    </div>
  );
}

/* ===================== USERS ===================== */
function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // local editable state per row (username + role)
  const [edits, setEdits] = useState<Record<string, { username: string; user_role: Role }>>({});

  const load = async () => {
    setLoading(true);
    setBanner(null);
    const { data, error } = await supabase
      .from("users")
      .select("id,email,created_at,username,user_role")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) setBanner({ kind: "err", text: error.message });
    else {
      const list = (data ?? []) as UserRow[];
      setRows(list);
      const map: Record<string, { username: string; user_role: Role }> = {};
      list.forEach((u) => (map[u.id] = { username: u.username ?? "", user_role: u.user_role }));
      setEdits(map);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return r.email?.toLowerCase().includes(t) || r.username?.toLowerCase().includes(t) || r.user_role?.toLowerCase().includes(t);
  });

  const onChange = (id: string, patch: Partial<{ username: string; user_role: Role }>) =>
    setEdits((m) => ({ ...m, [id]: { ...m[id], ...patch } }));

  const saveRow = async (u: UserRow) => {
    const e = edits[u.id];
    if (!e) return;
    if (e.username === (u.username ?? "") && e.user_role === u.user_role) return;
    setBanner(null);
    const { error } = await supabase.from("users").update({ username: e.username, user_role: e.user_role }).eq("id", u.id);
    setBanner(error ? { kind: "err", text: error.message } : { kind: "ok", text: "Saved." });
    if (!error) await load();
  };

  const resetPassword = async (email: string | null) => {
    if (!email) return;
    setBanner(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    setBanner(error ? { kind: "err", text: error.message } : { kind: "ok", text: `Password reset email sent to ${email}.` });
  };

  // Client-only delete: removes app data (sessions/reps/profile). Deleting the auth user requires server admin creds.
  const deleteUser = async (user_id: string) => {
    if (!confirm("Delete this user’s APP DATA (profile, sessions, reps)?\nAuth account remains unless removed via server admin.")) return;
    setBanner(null);
    const { error: e1 } = await supabase.from("session_reps").delete().eq("user_id", user_id);
    if (e1) return setBanner({ kind: "err", text: e1.message });
    const { error: e2 } = await supabase.from("training_sessions").delete().eq("user_id", user_id);
    if (e2) return setBanner({ kind: "err", text: e2.message });
    const { error: e3 } = await supabase.from("users").delete().eq("id", user_id);
    setBanner(e3 ? { kind: "err", text: e3.message } : { kind: "ok", text: "User app data deleted." });
    if (!e3) await load();
  };

  return (
    <Card title="Users">
      <div className="mb-3 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email / username / role…"
          className="w-72 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
        />
        <button onClick={load} className="ml-auto rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
          Refresh
        </button>
      </div>

      {banner && <Banner kind={banner.kind} text={banner.text} />}

      {loading ? (
        <TableLoading />
      ) : (
        <Table
          head={[
            "Email",
            "Username",
            "Role",
            "Created",
            <span key="a" className="float-right">Actions</span>,
          ]}
          rows={filtered.map((u) => [
            u.email,
            <input
              key="un"
              value={edits[u.id]?.username ?? ""}
              onChange={(e) => onChange(u.id, { username: e.target.value })}
              className="rounded border border-neutral-200 bg-white px-2 py-1"
            />,
            <select
              key="role"
              className="rounded border border-neutral-200 bg-white px-2 py-1"
              value={edits[u.id]?.user_role ?? u.user_role}
              onChange={(e) => onChange(u.id, { user_role: e.target.value as Role })}
            >
              <option value="regular">regular</option>
              <option value="it_admin">it_admin</option>
              <option value="super_admin">super_admin</option>
            </select>,
            u.created_at ? new Date(u.created_at).toLocaleString() : "—",
            <div key="act" className="flex gap-2 justify-end">
              <button
                onClick={() => saveRow(u)}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm"
                disabled={
                  !edits[u.id] ||
                  (edits[u.id].username === (u.username ?? "") && edits[u.id].user_role === u.user_role)
                }
              >
                Save
              </button>
              <button
                onClick={() => resetPassword(u.email)}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm"
              >
                Reset password
              </button>
              <button
                onClick={() => deleteUser(u.id)}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm text-red-600"
              >
                Delete
              </button>
            </div>,
          ])}
          empty="No users."
        />
      )}
    </Card>
  );
}

/* ===================== SESSIONS ===================== */
function SessionsPanel() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [tech, setTech] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setBanner(null);
    const since = new Date(); since.setDate(since.getDate() - 30);
    const { data, error } = await supabase
      .from("v_admin_sessions_30d")
      .select("*")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) setBanner({ kind: "err", text: error.message });
    else setRows((data ?? []) as SessionRow[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const t = q.trim().toLowerCase();
    if (tech && r.technique.toLowerCase() !== tech) return false;
    if (!t) return true;
    return (r.username ?? "").toLowerCase().includes(t) || (r.email ?? "").toLowerCase().includes(t) || r.technique.toLowerCase().includes(t);
  });

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this session? (Reps will also be removed)")) return;
    setBanner(null);
    const { error: e1 } = await supabase.from("session_reps").delete().eq("session_id", id);
    if (e1) return setBanner({ kind: "err", text: e1.message });
    const { error: e2 } = await supabase.from("training_sessions").delete().eq("id", id);
    setBanner(e2 ? { kind: "err", text: e2.message } : { kind: "ok", text: "Session deleted." });
    await load();
  };

  const techniques = useMemo(() => Array.from(new Set(rows.map((r) => r.technique.toLowerCase()))), [rows]);

  return (
    <Card title="Sessions (last 30 days)">
      <div className="mb-3 flex items-center gap-3">
        <select className="rounded-lg border border-neutral-200 bg-white px-2 py-2" value={tech} onChange={(e) => setTech(e.target.value)}>
          <option value="">All techniques</option>
          {techniques.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          placeholder="Search user/technique…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
        />
        <button onClick={load} className="ml-auto rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">Refresh</button>
      </div>

      {banner && <Banner kind={banner.kind} text={banner.text} />}

      {loading ? (
        <TableLoading />
      ) : (
        <Table
          head={["Started", "User", "Technique", <Right key="r1">Reps</Right>, <Right key="r2">Duration (s)</Right>, <Right key="r3">Actions</Right>]}
          rows={filtered.map((s) => [
            s.started_at ? new Date(s.started_at).toLocaleString() : "—",
            s.username ?? s.email ?? s.user_id ?? "—",
            <span key="t" className="capitalize">{s.technique}</span>,
            <Right key="reps">{s.total_reps ?? 0}</Right>,
            <Right key="dur">{s.duration_sec ?? 0}</Right>,
            <Right key="act">
              <button onClick={() => deleteSession(s.id)} className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm text-red-600">Delete</button>
            </Right>,
          ])}
          empty="No sessions."
        />
      )}
    </Card>
  );
}

/* ===================== REPORTS ===================== */
function ReportsPanel() {
  const [tot, setTot] = useState(0);
  const [active30, setActive30] = useState(0);
  const [sessions30, setSessions30] = useState(0);
  const [reps30, setReps30] = useState(0);
  const [mix, setMix] = useState<Mix[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      const [usersCount, sessions, mixRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("v_admin_sessions_30d").select("*"),
        supabase.from("v_admin_technique_mix_30d").select("*"),
      ]);
      if (usersCount.error) return setErr(usersCount.error.message);
      if (sessions.error) return setErr(sessions.error.message);
      if (mixRes.error) return setErr(mixRes.error.message);

      const srows = (sessions.data ?? []) as SessionRow[];
      setTot(usersCount.count ?? 0);
      setSessions30(srows.length);
      setActive30(new Set(srows.map((r) => r.user_id).filter(Boolean)).size);
      setReps30(srows.reduce((a, b) => a + (b.total_reps ?? 0), 0));
      setMix((mixRes.data ?? []) as Mix[]);
    })();
  }, []);

  return (
    <section className="space-y-6">
      {err && <Banner kind="err" text={err} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Total users (all-time)" value={tot} />
        <Kpi title="Active users (30d)" value={active30} />
        <Kpi title="Sessions (30d)" value={sessions30} />
        <Kpi title="Total reps (30d)" value={reps30} />
      </div>

      <Card title="Technique mix (30d)">
        <Table
          head={["Technique", <Right key="s">Sessions</Right>, <Right key="r">Reps</Right>]}
          rows={mix.map((m) => [
            <span key="t" className="capitalize">{m.technique}</span>,
            <Right key="s">{m.sessions}</Right>,
            <Right key="r">{m.reps}</Right>,
          ])}
          empty="No data."
        />
      </Card>
    </section>
  );
}

/* ---------------- Small UI helpers ---------------- */
function ScreenLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white text-neutral-600">
      Loading…
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-4 shadow-sm">
      <div className="px-2 pb-3 pt-1 font-semibold">{title}</div>
      <div className="rounded-xl border border-neutral-100 bg-white/70 p-3">{children}</div>
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
        <thead className="bg-neutral-50/70 text-neutral-600">
          <tr>{head.map((h, i) => <th key={i} className="p-3 text-left">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((cells, i) => (
              <tr key={i} className="border-t">
                {cells.map((c, j) => (
                  <td key={j} className="p-3 align-top">{c}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr><td className="p-4 text-neutral-500" colSpan={head.length}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function TableLoading() {
  return <div className="text-neutral-500 p-2">Loading…</div>;
}
function Banner({ kind, text }: { kind: "ok" | "err"; text: string }) {
  const cls = kind === "ok"
    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : "bg-red-50 border-red-200 text-red-700";
  return <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${cls}`}>{text}</div>;
}
function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4">
      <div className="text-xs font-medium text-neutral-600">{title}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${
        active ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-200 hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );
}
function Right({ children }: { children: React.ReactNode }) {
  return <span className="float-right">{children}</span>;
}
