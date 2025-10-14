"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Row = {
  user_id: string;
  technique: string;
  started_at: string | null;
  total_reps: number | null;
  duration_sec: number | null;
};

export default function LogsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("training_sessions") // ← correct table
      .select("user_id, technique, started_at, total_reps, duration_sec")
      .order("started_at", { ascending: false })
      .limit(50);

    setLoading(false);

    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }

    setRows((data as Row[]) || []);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    const ql = q.toLowerCase();
    return (
      (r.user_id || "").includes(q) ||
      (r.technique || "").toLowerCase().includes(ql) ||
      (r.started_at ? new Date(r.started_at).toLocaleString().toLowerCase().includes(ql) : false)
    );
  });

  return (
    <section className="rounded-2xl border border-red-100/70 bg-white/80 backdrop-blur p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Audit / Recent Sessions (50)</h2>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by technique / user_id / date"
            className="w-80 rounded-full border-2 border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-red-200 focus:outline-none focus:ring-0"
          />
          <button
            onClick={load}
            className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
          >
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Technique</th>
              <th className="py-2 pr-4">Reps</th>
              <th className="py-2 pr-4">Duration</th>
              <th className="py-2 pr-4">User ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-neutral-200">
                <td className="py-2 pr-4">
                  {r.started_at ? new Date(r.started_at).toLocaleString() : "—"}
                </td>
                <td className="py-2 pr-4">{r.technique || "—"}</td>
                <td className="py-2 pr-4">
                  {typeof r.total_reps === "number" ? r.total_reps : "—"}
                </td>
                <td className="py-2 pr-4">
                  {typeof r.duration_sec === "number" ? `${r.duration_sec}s` : "—"}
                </td>
                <td className="py-2 pr-4 text-neutral-500">{r.user_id}</td>
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td className="py-6 text-center text-neutral-500" colSpan={5}>
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="mt-3 text-sm text-neutral-600">Loading…</div>
      )}
    </section>
  );
}
