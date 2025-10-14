"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Rule = {
  id: string;
  technique: string;
  threshold_min: number | null;
  threshold_max: number | null;
  enabled: boolean | null;
  updated_at?: string | null;
};

const EMPTY: Rule = {
  id: "new",
  technique: "",
  threshold_min: 70,
  threshold_max: 95,
  enabled: true,
};

export default function TechniqueRulesPanel() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const sorted = useMemo(
    () => rows.slice().sort((a, b) => a.technique.localeCompare(b.technique)),
    [rows]
  );

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("technique_rules")
      .select("id, technique, threshold_min, threshold_max, enabled, updated_at");
    if (!error && data) setRows(data as Rule[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function editRow(idx: number, patch: Partial<Rule>) {
    setRows((r) => {
      const c = r.slice();
      c[idx] = { ...c[idx], ...patch };
      return c;
    });
  }

  async function save(row: Rule) {
    setMsg(null);
    if (!row.technique) { setMsg("Technique is required."); return; }

    if (row.id === "new") {
      const { data, error } = await supabase
        .from("technique_rules")
        .insert({
          technique: row.technique.toLowerCase(),
          threshold_min: row.threshold_min,
          threshold_max: row.threshold_max,
          enabled: row.enabled ?? true,
        })
        .select()
        .single();
      if (error) setMsg(error.message);
      else {
        setMsg("Rule added.");
        setRows((r) => r.filter((x) => x.id !== "new").concat(data as any));
      }
    } else {
      const { error } = await supabase
        .from("technique_rules")
        .update({
          technique: row.technique.toLowerCase(),
          threshold_min: row.threshold_min,
          threshold_max: row.threshold_max,
          enabled: row.enabled ?? true,
        })
        .eq("id", row.id);
      if (error) setMsg(error.message);
      else setMsg("Rule saved.");
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("technique_rules").delete().eq("id", id);
    if (error) setMsg(error.message);
    else {
      setMsg("Rule deleted.");
      setRows((r) => r.filter((x) => x.id !== id));
    }
  }

  return (
    <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Technique Rules / Thresholds</h2>
        <button
          onClick={() => setRows((r) => (r.find((x) => x.id === "new") ? r : [EMPTY, ...r]))}
          className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20"
        >
          + Add Rule
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-300">
                <th className="py-2 pr-4">Technique</th>
                <th className="py-2 pr-4">Min %</th>
                <th className="py-2 pr-4">Max %</th>
                <th className="py-2 pr-4">Enabled</th>
                <th className="py-2 pr-4">Updated</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const idx = rows.findIndex((x) => x.id === r.id);
                return (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="py-2 pr-4">
                      <input
                        className="bg-transparent border border-white/10 rounded px-2 py-1 w-40"
                        value={r.technique}
                        onChange={(e) => editRow(idx, { technique: e.target.value })}
                        placeholder="jab / cross / hook / uppercut"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        className="bg-transparent border border-white/10 rounded px-2 py-1 w-20"
                        value={r.threshold_min ?? ""}
                        onChange={(e) => editRow(idx, { threshold_min: Number(e.target.value) || null })}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        className="bg-transparent border border-white/10 rounded px-2 py-1 w-20"
                        value={r.threshold_max ?? ""}
                        onChange={(e) => editRow(idx, { threshold_max: Number(e.target.value) || null })}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={!!r.enabled}
                        onChange={(e) => editRow(idx, { enabled: e.target.checked })}
                      />
                    </td>
                    <td className="py-2 pr-4 text-gray-400">
                      {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right space-x-2">
                      <button
                        onClick={() => save(r)}
                        className="px-3 py-1.5 rounded bg-white/10 border border-white/20 hover:bg-white/20"
                      >
                        Save
                      </button>
                      {r.id !== "new" && (
                        <button
                          onClick={() => remove(r.id)}
                          className="px-3 py-1.5 rounded bg-red-500/20 border border-red-400/20 hover:bg-red-500/30"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    No rules yet. Click “Add Rule”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {msg && <div className="mt-3 text-sm text-gray-300">{msg}</div>}
    </section>
  );
}
