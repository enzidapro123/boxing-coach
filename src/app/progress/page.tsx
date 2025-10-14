// app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Row = {
  id: string;
  technique: "jab" | "cross" | "hook" | "uppercut" | "guard";
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null; // adjust the name if your column is different
  total_reps: number | null;
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      // NOTE: adjust "duration_sec" if your column is "duration_seconds"
      const { data, error } = await supabase
        .from("training_sessions")
        .select(
          "id, technique, started_at, finished_at, duration_sec, total_reps"
        )
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (!error && data) setRows(data as any);
      setLoading(false);
    })();
  }, []);

  const fmt = (ts?: string | null) =>
    ts ? new Date(ts).toLocaleString() : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <nav className="fixed top-0 w-full bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold">
            BlazePose Coach
          </a>
          <div className="hidden md:flex gap-6 text-gray-300">
            <a href="/training" className="hover:text-white">
              Training
            </a>
            <a href="/profile" className="hover:text-white">
              Profile
            </a>
          </div>
        </div>
      </nav>

      <main className="pt-28 px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Training History</h1>

          {loading ? (
            <p className="text-gray-300">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-gray-300">
              No sessions yet. Start one from the Training page.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">
                      {r.technique.charAt(0).toUpperCase() +
                        r.technique.slice(1)}
                    </div>
                    <div className="text-sm text-gray-300">
                      {fmt(r.started_at)}
                      {" · "}
                      {r.duration_sec ?? 0}s{" · "}
                      Total reps: {r.total_reps ?? 0}
                    </div>
                  </div>

                  <a
                    href={`/session?technique=${encodeURIComponent(
                      r.technique
                    )}`}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
                  >
                    Repeat
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
