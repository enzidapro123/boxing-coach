// app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Row = {
  id: string;
  technique: "jab" | "cross" | "hook" | "uppercut" | "guard";
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  total_reps: number | null;
};

const iconFor = (t: string) => {
  const k = (t || "").toLowerCase();
  if (k === "jab") return "👊";
  if (k === "cross") return "💥";
  if (k === "hook") return "🌟";
  if (k === "uppercut") return "⚡";
  if (k === "guard") return "🛡️";
  return "🥊";
};
const pretty = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
const fmtDate = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleString() : "—";
const fmtDuration = (sec?: number | null) => {
  const s = Math.max(0, sec ?? 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* soft background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/25 to-orange-400/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* Nav (matches landing/register) */}
      <nav className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 grid place-items-center text-white text-lg shadow-lg shadow-red-500/30">
              🥊
            </div>
            <span className="text-xl font-bold">BlazePose Coach</span>
          </a>
          <div className="hidden md:flex gap-6 text-neutral-700">
            <a href="/training" className="hover:text-neutral-900">Training</a>
            <a href="/profile" className="hover:text-neutral-900">Profile</a>
          </div>
        </div>
      </nav>

      <main className="px-6 pt-10 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2 text-xs font-semibold text-red-700">
              History
            </div>
            <h1 className="mt-3 text-4xl font-bold">Training history</h1>
            <p className="mt-2 text-neutral-600">
              Review recent sessions and quickly repeat a technique.
            </p>
          </div>

          {/* card container */}
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-300/30 to-orange-300/30 blur-3xl" />
            <div className="relative rounded-3xl border border-red-100/80 bg-white/85 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-red-500/10">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 rounded-2xl border border-neutral-200 bg-white animate-pulse"
                    />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🥊</div>
                  <p className="text-neutral-700 text-lg">No sessions yet</p>
                  <p className="text-neutral-500 text-sm mt-2">
                    Start one from the Training page to see it here.
                  </p>
                  <a
                    href="/training"
                    className="mt-6 inline-block rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-6 py-3 text-white font-semibold shadow-lg shadow-red-500/30 hover:scale-[1.02] transition"
                  >
                    Go to Training →
                  </a>
                </div>
              ) : (
                <>
                  {/* desktop: table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-neutral-600">
                          <th className="py-3 pr-4 font-semibold">Technique</th>
                          <th className="py-3 pr-4 font-semibold">Started</th>
                          <th className="py-3 pr-4 font-semibold">Duration</th>
                          <th className="py-3 pr-4 font-semibold">Total reps</th>
                          <th className="py-3 pr-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr
                            key={r.id}
                            className="border-t border-neutral-200/70 hover:bg-white/70 transition"
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{iconFor(r.technique)}</span>
                                <span className="font-medium">{pretty(r.technique)}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4">{fmtDate(r.started_at)}</td>
                            <td className="py-3 pr-4">{fmtDuration(r.duration_sec)}</td>
                            <td className="py-3 pr-4">{r.total_reps ?? 0}</td>
                            <td className="py-3 pr-0 text-right">
                              <a
                                href={`/session?technique=${encodeURIComponent(r.technique)}`}
                                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 font-semibold hover:bg-neutral-50 transition"
                              >
                                Repeat
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                                </svg>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* mobile: cards */}
                  <div className="md:hidden space-y-4">
                    {rows.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-neutral-200 bg-white/80 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{iconFor(r.technique)}</span>
                            <div>
                              <div className="font-semibold text-lg">
                                {pretty(r.technique)}
                              </div>
                              <p className="text-xs text-neutral-600">
                                {fmtDate(r.started_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">
                              {fmtDuration(r.duration_sec)}
                            </div>
                            <div className="text-xs text-neutral-600">
                              Reps: {r.total_reps ?? 0}
                            </div>
                          </div>
                        </div>

                        <a
                          href={`/session?technique=${encodeURIComponent(r.technique)}`}
                          className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 transition"
                        >
                          Repeat
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
