// app/super_admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { audit } from "@/app/lib/audit";

/* ---------------- Types ---------------- */
type Role = "regular" | "it_admin" | "super_admin";
type UserRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  username: string | null;
  user_role: Role;
};
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
      const { data, error } = await supabase
        .from("users")
        .select("user_role")
        .eq("id", uid)
        .maybeSingle();
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* soft gradient accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-orange-400/25 to-red-400/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-red-400/25 to-orange-400/25 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center hover:opacity-80 transition">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
            </a>
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl font-bold">Super Admin</h1>
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
  const [edits, setEdits] = useState<Record<string, { username: string; user_role: Role }>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id,email,created_at,username,user_role")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return setBanner({ kind: "err", text: error.message });
    const list = (data ?? []) as UserRow[];
    setRows(list);
    const map: Record<string, { username: string; user_role: Role }> = {};
    list.forEach((u) => (map[u.id] = { username: u.username ?? "", user_role: u.user_role }));
    setEdits(map);
  };
  useEffect(() => { load(); }, []);

  const onChange = (id: string, patch: Partial<{ username: string; user_role: Role }>) =>
    setEdits((m) => ({ ...m, [id]: { ...m[id], ...patch } }));

  const saveRow = async (u: UserRow) => {
    const e = edits[u.id];
    if (!e) return;
    const changed = e.username !== (u.username ?? "") || e.user_role !== u.user_role;
    if (!changed) return;
    const { error } = await supabase.from("users").update(e).eq("id", u.id);
    if (error) return setBanner({ kind: "err", text: error.message });
    await audit("admin.user.save", { user_id: u.id, changes: e });
    setBanner({ kind: "ok", text: "Saved." });
    load();
  };

  const resetPassword = async (u: UserRow) => {
    if (!u.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(u.email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    if (error) setBanner({ kind: "err", text: error.message });
    else {
      await audit("admin.user.reset_password", { user_id: u.id, email: u.email });
      setBanner({ kind: "ok", text: `Reset email sent to ${u.email}` });
    }
  };

  const deleteUser = async (user_id: string) => {
    if (!confirm("Delete this user permanently?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id }),
    });
    const payload = await res.json();
    if (!res.ok || payload.error) return setBanner({ kind: "err", text: payload.error || "Delete failed." });
    await audit("admin.user.delete", { user_id });
    setBanner({ kind: "ok", text: "User deleted." });
    load();
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
        <button onClick={load} className="ml-auto rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
          Refresh
        </button>
      </div>
      {banner && <Banner kind={banner.kind} text={banner.text} />}
      {loading ? (
        <TableLoading />
      ) : (
        <Table
          head={["Email", "Username", "Role", "Created", <Right key="a">Actions</Right>]}
          rows={rows
            .filter((u) =>
              [u.email, u.username, u.user_role].some((f) =>
                f?.toLowerCase().includes(q.trim().toLowerCase())
              )
            )
            .map((u) => [
              u.email,
              <input
                key="un"
                value={edits[u.id]?.username ?? ""}
                onChange={(e) => onChange(u.id, { username: e.target.value })}
                className="rounded border border-neutral-200 bg-white px-2 py-1"
              />,
              <select
                key="role"
                value={edits[u.id]?.user_role ?? u.user_role}
                onChange={(e) => onChange(u.id, { user_role: e.target.value as Role })}
                className="rounded border border-neutral-200 bg-white px-2 py-1"
              >
                <option value="regular">regular</option>
                <option value="it_admin">it_admin</option>
                <option value="super_admin">super_admin</option>
              </select>,
              u.created_at ? new Date(u.created_at).toLocaleString() : "—",
              <div key="act" className="flex gap-2 justify-end">
                <button onClick={() => saveRow(u)} className="btn">Save</button>
                <button onClick={() => resetPassword(u)} className="btn">Reset</button>
                <button onClick={() => deleteUser(u.id)} className="btn text-red-600">Delete</button>
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
  const [q, setQ] = useState("");
  const [tech, setTech] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await supabase
      .from("v_admin_sessions_30d")
      .select("*")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false });
    setRows((data ?? []) as SessionRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const t = q.trim().toLowerCase();
    if (tech && r.technique.toLowerCase() !== tech) return false;
    if (!t) return true;
    return (r.username ?? "").toLowerCase().includes(t) || (r.email ?? "").toLowerCase().includes(t);
  });

  return (
    <Card title="Sessions (last 30 days)">
      <div className="mb-3 flex items-center gap-3">
        <select
          className="rounded-lg border border-neutral-200 bg-white px-2 py-2"
          value={tech}
          onChange={(e) => setTech(e.target.value)}
        >
          <option value="">All techniques</option>
          {[...new Set(rows.map((r) => r.technique))].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          placeholder="Search user/technique…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
        />
        <button onClick={load} className="ml-auto rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
          Refresh
        </button>
      </div>
      {loading ? (
        <TableLoading />
      ) : (
        <Table
          head={["Started", "User", "Technique", <Right key="r1">Reps</Right>, <Right key="r2">Duration</Right>]}
          rows={filtered.map((s) => [
            s.started_at ? new Date(s.started_at).toLocaleString() : "—",
            s.username ?? s.email ?? "—",
            s.technique,
            <Right key="reps">{s.total_reps ?? 0}</Right>,
            <Right key="dur">{s.duration_sec ?? 0}</Right>,
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

  useEffect(() => {
    (async () => {
      const [usersCount, sessions] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("v_admin_sessions_30d").select("*"),
      ]);
      const srows = (sessions.data ?? []) as SessionRow[];
      setTot(usersCount.count ?? 0);
      setSessions30(srows.length);
      setActive30(new Set(srows.map((r) => r.user_id).filter(Boolean)).size);
      setReps30(srows.reduce((a, b) => a + (b.total_reps ?? 0), 0));
    })();
  }, []);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Total users" value={tot} />
        <Kpi title="Active (30d)" value={active30} />
        <Kpi title="Sessions (30d)" value={sessions30} />
        <Kpi title="Reps (30d)" value={reps30} />
      </div>
    </section>
  );
}

/* ---------------- Small UI helpers ---------------- */
function ScreenLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 text-neutral-600">
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
              <tr key={i} className="border-t">{cells.map((c, j) => <td key={j} className="p-3 align-top">{c}</td>)}</tr>
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
  const cls = kind === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700";
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
const btn = "rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm hover:bg-neutral-50 transition";
