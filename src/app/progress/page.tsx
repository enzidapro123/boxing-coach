// app/progress/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/app/lib/supabaseClient";
import { useBranding } from "@/app/branding-provider";

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

type UserProgressInsert = {
  user_id: string;
  technique: string;
  created_at: string;
  total_reps: number;
  notes: string; // format: "auto:<session_id>"
  progress_percentage?: number;
  accuracy?: number;
  avg_score?: number;
};

/* --------------------------- Helpers --------------------------- */
const iconFor = (tech: string) => {
  const t = (tech || "").toLowerCase();
  if (t === "jab") return "👊";
  if (t === "cross") return "💥";
  if (t === "hook") return "🌀";
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
  const mins = minutes(
    typeof r.duration_sec === "number"
      ? r.duration_sec
      : r.started_at && r.finished_at
      ? Math.max(
          0,
          Math.round(
            (new Date(r.finished_at).getTime() -
              new Date(r.started_at).getTime()) /
              1000
          )
        )
      : undefined
  );
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
    return { label: "Unrated", color: "text-neutral-400" };
  if (score >= 90) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 75) return { label: "Good", color: "text-blue-600" };
  if (score >= 60) return { label: "Fair", color: "text-amber-600" };
  return { label: "Needs work", color: "text-rose-600" };
}

/* ------------------------------ Page ------------------------------ */
export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // user-selectable calendar range (days)
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30>(7);

  // ensure we auto-sync only once per visit
  const syncedRef = useRef(false);

  // 🔹 get current branding (for logo etc.)
  const branding = useBranding();

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
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Failed to load progress.";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* -------------------- Auto-save accuracy to user_progress -------------------- */
  useEffect(() => {
    (async () => {
      if (loading || syncedRef.current || !rows.length) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const candidates = rows.filter((s) => {
          const sc = derivedScore(s);
          const reps = s.total_reps ?? 0;
          return (typeof sc === "number" && sc >= 0) || reps > 0;
        });

        if (!candidates.length) {
          syncedRef.current = true;
          return;
        }

        const { data: existing, error: exErr } = await supabase
          .from("user_progress")
          .select("notes")
          .eq("user_id", user.id)
          .ilike("notes", "auto:%");

        if (exErr) {
          console.warn("user_progress existing fetch warning:", exErr.message);
        }

        const already = new Set<string>();
        (existing || []).forEach((r: { notes?: string | null }) => {
          const note = r?.notes ?? "";
          if (typeof note === "string" && note.startsWith("auto:")) {
            already.add(note.slice(5));
          }
        });

        const clampScore = (v: number | null) =>
          typeof v === "number"
            ? Math.max(0, Math.min(100, Math.round(v)))
            : undefined;

        const rowsToInsert: UserProgressInsert[] = candidates
          .filter((s) => !already.has(s.id))
          .map((s) => {
            const sc = clampScore(derivedScore(s));
            const base: UserProgressInsert = {
              user_id: user.id,
              technique: String(s.technique || "jab"),
              created_at: new Date().toISOString(),
              total_reps:
                typeof s.total_reps === "number"
                  ? Math.max(0, s.total_reps)
                  : 0,
              notes: `auto:${s.id}`,
              ...(typeof sc === "number"
                ? {
                    progress_percentage: sc,
                    accuracy: sc,
                    avg_score: sc,
                  }
                : {}),
            };
            return base;
          });

        if (rowsToInsert.length) {
          const { error } = await supabase
            .from("user_progress")
            .insert(rowsToInsert);
          if (error) {
            console.warn("user_progress auto-insert failed:", error.message);
          }
        }
      } finally {
        syncedRef.current = true;
      }
    })();
  }, [loading, rows]);

  /* -------------------- Filter by local calendar days -------------------- */
  const filteredRows = useMemo(() => {
    if (!rows.length) return [];
    const end = endOfDayLocal(new Date());
    const begin = startOfDayLocal(
      new Date(Date.now() - (rangeDays - 1) * 24 * 60 * 60 * 1000)
    );
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
      const k = dayKeyLocal(r.started_at);
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
        mins += minutes(
          typeof r.duration_sec === "number"
            ? r.duration_sec
            : r.started_at && r.finished_at
            ? Math.max(
                0,
                Math.round(
                  (new Date(r.finished_at).getTime() -
                    new Date(r.started_at).getTime()) /
                    1000
                )
              )
            : undefined
        );
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
      <div
        className="min-h-screen grid place-items-center text-neutral-700"
        style={{ background: "var(--background-color, #fefcf5)" }}
      >
        Loading progress…
      </div>
    );
  }
  if (err) {
    return (
      <div
        className="min-h-screen grid place-items-center"
        style={{ background: "var(--background-color, #fefcf5)" }}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 shadow">
          {err}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-neutral-900 relative"
      style={{ background: "var(--background-color, #fefcf5)" }}
    >
      {/* soft background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, var(--primary-color, #ef4444), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, var(--secondary-color, #f97316), transparent 70%)",
          }}
        />
      </div>

      {/* Glassy header */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-2 hover:opacity-80 transition"
            >
              <Image
                src={branding?.logoUrl || "/logo.png"}
                alt="Logo"
                width={32}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border px-4 py-2 text-sm font-semibold bg-white hover:bg-neutral-50 transition"
              prefetch
              style={{
                borderColor: "var(--primary-color, #ef4444)",
                color: "var(--primary-color, #ef4444)",
              }}
            >
              ← Back to dashboard
            </Link>
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl font-bold">Progress &amp; Drills</h1>
              <p className="text-xs text-neutral-600">
                Track volume, tempo, and daily quality
              </p>
            </div>
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
        <section className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50 to-sky-50 p-6">
          <div className="absolute -inset-10 bg-gradient-to-br from-sky-200/20 to-blue-200/20 blur-3xl" />
          <div className="relative">
            <h2 className="text-lg font-semibold text-blue-700 mb-1">
              ℹ️ How “Accuracy” is estimated
            </h2>
            <p className="text-sm text-neutral-700">
              Your performance score is derived from{" "}
              <span className="font-semibold">reps per minute (RPM)</span>.
              Higher RPM reflects smoother tempo and consistency. Daily averages
              combine all drills to show your{" "}
              <span className="font-semibold">average RPM per day</span>.
            </p>
          </div>
        </section>

        {/* Day-over-day comparison */}
        {dayCompare && (
          <section className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Day-over-day comparison
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
              <ul className="mt-6 list-disc pl-6 text-sm text-neutral-700 space-y-1">
                {dayCompare.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* History grouped by local day (filtered) */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Drill feedback history</h2>
          {byDay.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur p-10 text-center text-neutral-600">
              No sessions in the selected range.
            </div>
          ) : (
            byDay.map((d) => (
              <section
                key={d.date}
                className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">{d.date}</div>
                  <div className="text-sm text-neutral-600">
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
                        className="rounded-xl border border-neutral-200 bg-white px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {iconFor(s.technique)}
                          </span>
                          <div>
                            <div className="font-semibold">
                              {pretty(s.technique)}
                            </div>
                            <div className="text-xs text-neutral-600">
                              {s.started_at
                                ? new Date(s.started_at).toLocaleTimeString()
                                : "—"}{" "}
                              ·{" "}
                              {minutes(
                                typeof s.duration_sec === "number"
                                  ? s.duration_sec
                                  : s.started_at && s.finished_at
                                  ? Math.max(
                                      0,
                                      Math.round(
                                        (new Date(s.finished_at).getTime() -
                                          new Date(s.started_at).getTime()) /
                                          1000
                                      )
                                    )
                                  : undefined
                              )}
                              m · {s.total_reps ?? 0} reps
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
              </section>
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
    <div className="relative overflow-hidden rounded-2xl border bg-white/85 backdrop-blur-xl p-5 shadow-sm">
      <div
        className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-15 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, var(--primary-color, #ef4444), transparent 70%)",
        }}
      />
      <div className="text-xs font-medium text-neutral-600">{label}</div>
      <div className="text-3xl font-extrabold mt-1">{value}</div>
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
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="text-sm text-neutral-600">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold ${
            same
              ? "text-neutral-500"
              : up
              ? "text-emerald-600"
              : "text-rose-600"
          }`}
        >
          {diff > 0 ? "+" : ""}
          {diff}
          {unit}
        </span>
        <span className="text-xs text-neutral-500">
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
  const base = "px-3 py-1.5 rounded-full text-sm border transition";
  const active = "text-white";
  const idle =
    "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50";

  return (
    <div className="inline-flex gap-2">
      <button
        className={`${base} ${value === 1 ? active : idle}`}
        onClick={() => onChange(1)}
        style={
          value === 1
            ? {
                background:
                  "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
                borderColor: "transparent",
              }
            : undefined
        }
      >
        1d
      </button>
      <button
        className={`${base} ${value === 7 ? active : idle}`}
        onClick={() => onChange(7)}
        style={
          value === 7
            ? {
                background:
                  "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
                borderColor: "transparent",
              }
            : undefined
        }
      >
        7d
      </button>
      <button
        className={`${base} ${value === 30 ? active : idle}`}
        onClick={() => onChange(30)}
        style={
          value === 30
            ? {
                background:
                  "linear-gradient(to right, var(--primary-color, #ef4444), var(--secondary-color, #f97316))",
                borderColor: "transparent",
              }
            : undefined
        }
      >
        30d
      </button>
    </div>
  );
}
