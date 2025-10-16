// app/summary/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

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
  if (t === "hook") return "🌀";
  if (t === "uppercut") return "⚡";
  if (t === "guard") return "🛡️";
  return "🥊";
};
const pretty = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// minutes helper used by RPM/score math
const minutes = (sec?: number | null) =>
  typeof sec === "number" ? Math.max(1, Math.round(sec / 60)) : 1;

/** Prefer row.duration_sec; if missing but timestamps exist, compute it. */
function durationSeconds(row?: {
  duration_sec: number | null;
  started_at: string | null;
  finished_at: string | null;
}) {
  if (!row) return 0;
  if (typeof row.duration_sec === "number")
    return Math.max(0, row.duration_sec);
  if (row.started_at && row.finished_at) {
    const s = new Date(row.started_at).getTime();
    const f = new Date(row.finished_at).getTime();
    if (isFinite(s) && isFinite(f))
      return Math.max(0, Math.round((f - s) / 1000));
  }
  return 0;
}

/** Human display: seconds if short; rounded minutes if longer. */
function formatDurationLabel(sec: number) {
  if (!sec) return "—";
  if (sec < 90) return `${sec}s`;
  const m = Math.round(sec / 60);
  return `${m}m`;
}

// Derive a 0–100 score from volume density (reps per min), same as Progress page
function derivedScoreLikeProgress(
  r: Pick<SessionRow, "technique" | "total_reps"> & { duration_sec: number }
) {
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
    return { label: "Unrated", color: "text-neutral-400" };
  if (score >= 90) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 75) return { label: "Good", color: "text-blue-600" };
  if (score >= 60) return { label: "Fair", color: "text-amber-600" };
  return { label: "Needs work", color: "text-rose-600" };
}

/* ------------------------------ Page ------------------------------ */
export default function SummaryPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<SessionRow | null>(null);

  const sid = params.get("sid"); // optional ?sid=<session_id>

  useEffect(() => {
    (async () => {
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

        let q = supabase
          .from("training_sessions")
          .select(
            "id, user_id, technique, started_at, finished_at, duration_sec, total_reps"
          )
          .eq("user_id", user.id);

        if (sid) {
          q = q.eq("id", sid).limit(1);
        } else {
          q = q.order("started_at", { ascending: false }).limit(1);
        }

        const { data, error } = await q;
        if (error) throw error;

        const rec = (data?.[0] as SessionRow | undefined) ?? null;
        setRow(rec);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg || "Failed to load session summary.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, sid]);

  const durationSec = useMemo(() => durationSeconds(row || undefined), [row]);
  const durationLabel = useMemo(
    () => formatDurationLabel(durationSec),
    [durationSec]
  );

  const reps = row?.total_reps ?? 0;

  const rpm = useMemo(() => {
    if (!row) return 0;
    const mins = minutes(durationSec);
    return +(reps / mins).toFixed(1);
  }, [row, durationSec, reps]);

  const score = useMemo(
    () =>
      row
        ? derivedScoreLikeProgress({
            technique: row.technique,
            total_reps: row.total_reps ?? 0,
            duration_sec: durationSec,
          })
        : null,
    [row, durationSec]
  );

  const scoreBadge = ratingLabel(score);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white text-neutral-700">
        Preparing your summary…
      </div>
    );
  }
  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white">
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-700 shadow">
          {err}
        </div>
      </div>
    );
  }
  if (!row) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-neutral-50 to-white text-neutral-700">
        No session found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white text-neutral-900 relative">
      {/* soft orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-red-400/25 to-orange-400/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/20 to-red-500/20 blur-3xl" />
      </div>

      {/* Glassy header */}
      <header className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-xl border-b border-neutral-200/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/training"
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 transition"
              prefetch
            >
              ← Back to training
            </Link>
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl font-bold">Session summary</h1>
              <p className="text-xs text-neutral-600">Review your last drill</p>
            </div>
          </div>
          {/* (buttons moved to bottom per request) */}
          <div />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Hero card */}
        <section className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/85 backdrop-blur-xl p-6 md:p-8 shadow-sm">
          <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br from-red-600 to-orange-500 opacity-10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="text-4xl">{iconFor(row.technique)}</div>
            <div>
              <div className="text-sm text-neutral-600">Technique</div>
              <div className="text-2xl font-extrabold">
                {pretty(row.technique)}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-neutral-600">Started</div>
              <div className="font-semibold">
                {row.started_at
                  ? new Date(row.started_at).toLocaleString()
                  : "—"}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Total reps" value={String(reps)} />
            <Kpi label="Duration" value={durationLabel} />
            <Kpi label="RPM" value={isFinite(rpm) ? String(rpm) : "0"} />
            <Kpi
              label="Score"
              value={typeof score === "number" ? `${score}%` : "—"}
              badge={scoreBadge}
            />
          </div>
        </section>

        {/* Bottom actions (moved here) */}
        <section className="flex flex-wrap gap-3 justify-end">
          <Link
            href="/dashboard"
            className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50 transition"
            prefetch
          >
            Go to dashboard
          </Link>
          <Link
            href="/progress"
            className="rounded-full bg-gradient-to-r from-red-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:scale-[1.03] transition"
            prefetch
          >
            View progress
          </Link>
        </section>
      </main>
    </div>
  );
}

/* ------------------------- Small components ------------------------- */
function Kpi({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: { label: string; color: string };
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/80 p-4">
      <div className="text-xs font-medium text-neutral-600">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
      {badge && (
        <div className={`mt-1 text-xs font-semibold ${badge.color}`}>
          {badge.label}
        </div>
      )}
    </div>
  );
}
