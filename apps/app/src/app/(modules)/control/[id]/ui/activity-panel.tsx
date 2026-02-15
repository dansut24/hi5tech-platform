"use client";

import { useEffect, useMemo, useState } from "react";

type ActivityRow = {
  id: string;
  ts: string;
  kind: string;
  device_id?: string | null;
  actor?: string | null;
  summary: string;
  meta?: Record<string, any> | null;
};

function fmtTime(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

export default function ActivityPanel({ deviceId }: { deviceId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/control/activity", window.location.origin);
      url.searchParams.set("device_id", deviceId);
      if (q.trim()) url.searchParams.set("q", q.trim());

      const res = await fetch(url.toString(), {
        headers: { "X-Tenant-ID": "tnt_demo" },
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`);
      }

      const data = await res.json();
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message ?? "Failed to load activity (backend not wired yet).");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => `${r.kind} ${r.actor ?? ""} ${r.summary}`.toLowerCase().includes(term));
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Activity</div>
          <p className="text-sm opacity-75 mt-1">Device-scoped audit trail (ready for backend wiring).</p>
        </div>
        <button className="hi5-btn-ghost text-sm" type="button" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}

      <div className="hi5-panel p-4">
        <div className="text-xs opacity-70 mb-1">Search</div>
        <input className="hi5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search device activity…" />
        <div className="mt-3 text-xs opacity-70">
          Showing <span className="font-semibold">{filtered.length}</span> events.
        </div>
      </div>

      <div className="hi5-panel p-4">
        {filtered.length === 0 ? (
          <div className="text-sm opacity-70">No events yet (or backend not wired).</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="hi5-panel p-3">
                <div className="text-xs opacity-70">{fmtTime(r.ts)}</div>
                <div className="mt-1 font-semibold">{r.summary}</div>
                <div className="mt-1 text-xs opacity-70">
                  <span className="font-mono">{r.kind}</span>
                  {r.actor ? <> · <span className="font-mono">{r.actor}</span></> : null}
                </div>
                {r.meta ? (
                  <div className="mt-2 text-[11px] opacity-70 font-mono whitespace-pre-wrap">
                    {JSON.stringify(r.meta, null, 2)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
