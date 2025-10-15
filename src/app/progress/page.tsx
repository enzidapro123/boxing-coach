// app/progress/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link"; // ← added
import { supabase } from "@/app/lib/supabaseClient";

type Technique = "jab" | "cross" | "hook" | "uppercut" | "guard" | string;

type SessionRow = {
  id: string;
  user_id: string;
  technique: Technique;
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
  total_reps: number | null;
};

/* --------------------------- Helpers --------------------------- */
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
const minutes = (sec?: number | null) =>
  typeof sec === "number" ? Math.max(1, Math.round(sec / 60)) : 1;

// ----- Local calendar day utilities (fixes UTC drift) -----
const ymdLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const startOfDayLocal = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDayLocal = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const dayKeyLocal = (iso: string) => ymdLocal(new Date(iso));

// Derive a 0–100 score from volume density (reps per min)
function derivedScore(r: SessionRow): number | null {
  const reps = r.total_reps ?? 0;
  const mins = minutes(r.duration_sec);
  if (!reps) return null;
  const rpm = reps / mins; // reps per minute

  // Map rpm to 0..100 (tunables)
  let score = Math.round(Math.min(100, Math.max(0, (rpm / 12) * 100)));

  // Light technique weighting (guard sessions usually low reps)
  if ((r.technique || "").toLowerCase() === "guard") {
    score = Math.min(100, Math.round(score * 0.8 + 20));
  }
  return score;
}

function ratingLabel(score: number | null | undefined) {
  if (typeof score !== "number")
    return { label: "Unrated", color: "text-gray-300" };
  if (score >= 90) return { label: "Excellent", color: "text-emerald-400" };
  if (score >= 75) return { label: "Good", color: "text-blue-400" };
  if (score >= 60) return { label: "Fair", color: "text-amber-400" };
  return { label: "Needs work", color: "text-rose-400" };
}

/* ------------------------------ Page ------------------------------ */
export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // user-selectable calendar range (days)
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30>(7);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);

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
            "id, user_id, technique, started_at, finished_at, duration_sec, total_reps"
          )
          .eq("user_id", user.id)
          .order("started_at", { ascending: false });

        if (error) throw error;
        setRows((data || []) as SessionRow[]);
      } catch (e: any) {
        setErr(e?.message || "Failed to load progress.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* -------------------- Filter by local calendar days -------------------- */
  const filteredRows = useMemo(() => {
    if (!rows.length) return [];
    const end = endOfDayLocal(new Date()); // end of today
    const begin = startOfDayLocal(
      new Date(Date.now() - (rangeDays - 1) * 24 * 60 * 60 * 1000)
    ); // start of (today - (N-1))
    return rows.filter((r) => {
      if (!r.started_at) return false;
      const t = new Date(r.started_at);
      return t >= begin && t <= end;
    });
  }, [rows, rangeDays]);

  // Group by day + daily totals & averages (using derivedScore)
  const byDay = useMemo(() => {
    const map: Record<
      string,
      {
        date: string;
        sessions: SessionRow[];
        totalReps: number;
        totalMinutes: number;
        avgScore: number | null;
      }
    > = {};
    for (const r of filteredRows) {
      if (!r.started_at) continue;
      const k = dayKeyLocal(r.started_at); // local day key
      (map[k] ||= {
        date: k,
        sessions: [],
        totalReps: 0,
        totalMinutes: 0,
        avgScore: null,
      }).sessions.push(r);
    }
    Object.values(map).forEach((d) => {
      let reps = 0,
        mins = 0,
        sSum = 0,
        sCnt = 0;
      for (const r of d.sessions) {
        reps += r.total_reps ?? 0;
        mins += minutes(r.duration_sec);
        const sc = derivedScore(r);
        if (typeof sc === "number") {
          sSum += sc;
          sCnt++;
        }
      }
      d.totalReps = reps;
      d.totalMinutes = mins;
      d.avgScore = sCnt ? Math.round(sSum / sCnt) : null;
    });
    return Object.values(map).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filteredRows]);

  // Summary for selected range
  const summary = useMemo(() => {
    const totalReps = byDay.reduce((a, d) => a + d.totalReps, 0);
    const sessionsCount = byDay.reduce((a, d) => a + d.sessions.length, 0);
    const avgScore =
      byDay.reduce((a, d) => a + (d.avgScore ?? 0), 0) /
      (byDay.filter((d) => d.avgScore !== null).length || 1);
    return {
      totalReps,
      sessionsCount,
      avgScore: Math.round(avgScore || 0),
    };
  }, [byDay]);

  // Compare latest day vs previous day within selected range
  const dayCompare = useMemo(() => {
    if (byDay.length < 2) return null;
    const [today, prev] = byDay;
    const repsDiff = today.totalReps - prev.totalReps;
    const scoreDiff = (today.avgScore ?? 0) - (prev.avgScore ?? 0);
    const minDiff = today.totalMinutes - prev.totalMinutes;

    const tips: string[] = [];
    const worst = [...today.sessions].sort(
      (a, b) => (derivedScore(a) ?? 0) - (derivedScore(b) ?? 0)
    )[0];
    if (worst) {
      const t = (worst.technique || "").toLowerCase();
      if (t === "jab") tips.push("Jab: extend fully, snap, and retract fast.");
      else if (t === "cross")
        tips.push("Cross: rotate hips and pivot rear foot.");
      else if (t === "hook") tips.push("Hook: elbow level, compact arc.");
      else if (t === "uppercut")
        tips.push("Uppercut: drive from legs; recover guard.");
      else if (t === "guard")
        tips.push("Guard: elbows in, chin down, hands up.");
      else tips.push(`${pretty(worst.technique)}: focus on clean form.`);
    }
    if (repsDiff < 0)
      tips.push("Total reps decreased—add a short volume block.");
    if (minDiff < 0)
      tips.push("Training time decreased—aim for steady minutes.");
    if (scoreDiff < 0)
      tips.push("Quality dipped—slow down and prioritize technique cues.");

    return { today, prev, repsDiff, scoreDiff, minDiff, tips };
  }, [byDay]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-900 text-white">
        Loading progress…
      </div>
    );
  }
  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-900 text-white">
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
          <div className="font-semibold mb-2">Error</div>
          <div className="text-sm text-gray-300">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ← Back to Dashboard */}
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-lg text-sm font-semibold text-white border border-white/20 transition-all shadow-md"
              prefetch
            >
              ⏪ Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Progress & Drills</h1>
          </div>

          {/* Range switcher */}
          <RangeSwitch value={rangeDays} onChange={setRangeDays} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Summary (selected range) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <CardStat
            label={`Total reps (${rangeDays}d)`}
            value={String(summary.totalReps)}
          />
          <CardStat
            label={`Avg score (${rangeDays}d)`}
            value={`${summary.avgScore}%`}
          />
          <CardStat
            label={`Sessions (${rangeDays}d)`}
            value={String(summary.sessionsCount)}
          />
        </section>

        {/* Accuracy Estimation Note */}
        <section className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-6 text-sm text-gray-300">
          <h2 className="text-lg font-semibold text-blue-300 mb-2">
            ℹ️ How Accuracy is Estimated
          </h2>
          <p>
            Your performance “accuracy” score is derived from{" "}
            <span className="text-white font-semibold">
              reps per minute (RPM)
            </span>
            —higher RPM reflects smoother tempo and consistency. Daily averages
            combine all drills to show
            <span className="text-white"> average RPM per day</span>.
          </p>
        </section>

        {/* Day-over-day comparison */}
        {dayCompare && (
          <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              Day-over-Day Comparison
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CompareBadge label="Reps" diff={dayCompare.repsDiff} unit="" />
              <CompareBadge
                label="Score"
                diff={dayCompare.scoreDiff}
                unit="%"
              />
              <CompareBadge label="Time" diff={dayCompare.minDiff} unit="m" />
            </div>
            {dayCompare.tips.length > 0 && (
              <ul className="mt-6 list-disc pl-6 text-sm text-gray-300 space-y-1">
                {dayCompare.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* History grouped by local day (filtered) */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Drill Feedback History</h2>
          {byDay.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-gray-400">
              No sessions in the selected range.
            </div>
          ) : (
            byDay.map((d) => (
              <div
                key={d.date}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">{d.date}</div>
                  <div className="text-sm text-gray-300">
                    {d.totalReps} reps · {d.totalMinutes}m ·{" "}
                    {d.avgScore !== null
                      ? `${d.avgScore}% avg score`
                      : "unrated"}
                  </div>
                </div>

                <div className="space-y-3">
                  {d.sessions.map((s) => {
                    const sc = derivedScore(s);
                    const r = ratingLabel(sc);
                    return (
                      <div
                        key={s.id}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {iconFor(s.technique)}
                          </span>
                          <div>
                            <div className="font-semibold">
                              {pretty(s.technique)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {s.started_at
                                ? new Date(s.started_at).toLocaleTimeString()
                                : "—"}{" "}
                              · {minutes(s.duration_sec)}m · {s.total_reps ?? 0}{" "}
                              reps
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${r.color}`}>
                          {r.label} {typeof sc === "number" ? `(${sc}%)` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

/* ------------------------- Small components ------------------------- */
function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
function CompareBadge({
  label,
  diff,
  unit,
}: {
  label: string;
  diff: number;
  unit: string;
}) {
  const up = diff > 0,
    same = diff === 0;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold ${
            same ? "text-gray-300" : up ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {diff > 0 ? "+" : ""}
          {diff}
          {unit}
        </span>
        <span className="text-xs text-gray-400">
          {up ? "Improved" : same ? "No change" : "Lower"}
        </span>
      </div>
    </div>
  );
}

// 1d / 7d / 30d selector
function RangeSwitch({
  value,
  onChange,
}: {
  value: 1 | 7 | 30;
  onChange: (v: 1 | 7 | 30) => void;
}) {
  const base = "px-3 py-1.5 rounded-lg text-sm border transition";
  const active = "bg-white/15 border-white/30 text-white";
  const idle = "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10";
  return (
    <div className="inline-flex gap-2">
      <button
        className={`${base} ${value === 1 ? active : idle}`}
        onClick={() => onChange(1)}
      >
        1d
      </button>
      <button
        className={`${base} ${value === 7 ? active : idle}`}
        onClick={() => onChange(7)}
      >
        7d
      </button>
      <button
        className={`${base} ${value === 30 ? active : idle}`}
        onClick={() => onChange(30)}
      >
        30d
      </button>
    </div>
  );
}
