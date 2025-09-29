"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type SessionRow = {
  id: string;
  technique: string;
  accuracy: number | null;
  duration_sec: number | null;
  created_at: string;
  notes?: string | null;
};

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [techFilter, setTechFilter] = useState<string>("All");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load current user + profile
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      setUserName(profile?.username || user.email);
      setAvatarUrl(profile?.avatar_url || null);
    })();
  }, []);

  const where = useMemo(() => {
    const filters: any[] = [];
    if (techFilter !== "All") filters.push({ col: "technique", op: "eq", val: techFilter });
    if (fromDate) filters.push({ col: "created_at", op: "gte", val: new Date(fromDate).toISOString() });
    if (toDate) {
      // include end-of-day
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filters.push({ col: "created_at", op: "lte", val: end.toISOString() });
    }
    return filters;
  }, [techFilter, fromDate, toDate]);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      let query = supabase
        .from("sessions")
        .select("id, technique, accuracy, duration_sec, created_at, notes")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      for (const f of where) {
        // @ts-ignore
        query = query[f.op](f.col, f.val);
      }

      const { data, error, count } = await query;
      if (error) {
        console.error(error);
        setSessions([]);
        setHasMore(false);
      } else {
        setSessions(data || []);
        setHasMore((data || []).length === PAGE_SIZE);
      }
      setLoading(false);
    })();
  }, [userId, where]);

  const loadMore = async () => {
    if (!userId) return;
    const start = sessions.length;
    const end = start + PAGE_SIZE - 1;

    let query = supabase
      .from("sessions")
      .select("id, technique, accuracy, duration_sec, created_at, notes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(start, end);

    for (const f of where) {
      // @ts-ignore
      query = query[f.op](f.col, f.val);
    }

    const { data, error } = await query;
    if (error) return console.error(error);

    const newRows = data || [];
    setSessions((prev) => [...prev, ...newRows]);
    if (newRows.length < PAGE_SIZE) setHasMore(false);
  };

  const techniques = ["All", "Jab", "Cross", "Hook", "Uppercut", "Guard"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Nav */}
      <header className="fixed top-0 w-full bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-xl">🥊</div>
            <span className="text-xl font-bold">BlazePose Coach</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/training" className="text-gray-300 hover:text-white">Training</a>
            <a href="/history" className="text-white font-semibold">History</a>
            <a href="/profile" className="text-gray-300 hover:text-white">Profile</a>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-lg font-bold">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <span>{userName?.[0]?.toUpperCase() ?? "U"}</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <section className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">View History</h1>
            <p className="text-gray-300">Review your past training sessions, filter by technique or date, and track progress.</p>
          </section>

          {/* Filters */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-300">Technique</label>
                <select
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none"
                  value={techFilter}
                  onChange={(e) => setTechFilter(e.target.value)}
                >
                  {techniques.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-300">From</label>
                <input
                  type="date"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-300">To</label>
                <input
                  type="date"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            {loading && (
              <div className="text-gray-300">Loading sessions…</div>
            )}

            {!loading && sessions.length === 0 && (
              <div className="text-gray-300">No sessions found. Try adjusting filters or start a new session.</div>
            )}

            {sessions.map((s) => (
              <a
                key={s.id}
                href={`/training/session/${s.id}`} // optional detail page
                className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold">{s.technique}</div>
                    <div className="text-sm text-gray-300">
                      {new Date(s.created_at).toLocaleString()} • {s.duration_sec ? `${Math.round(s.duration_sec / 60)} min` : "—"}
                    </div>
                    {s.notes && <div className="text-sm text-gray-200 mt-1 line-clamp-2">{s.notes}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold">{s.accuracy != null ? `${Math.round(s.accuracy)}%` : "—"}</div>
                    <div className="text-xs text-gray-300">Accuracy</div>
                  </div>
                </div>
              </a>
            ))}

            {hasMore && !loading && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  className="mt-4 inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
