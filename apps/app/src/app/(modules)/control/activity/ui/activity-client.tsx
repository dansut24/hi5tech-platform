"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ActivityKind =
  | "device_checkin"
  | "job_created"
  | "job_result"
  | "service_action"
  | "terminal_opened"
  | "file_download"
  | "file_upload"
  | "auth"
  | "other";

type ActivityRow = {
  id: string;
  ts: string; // ISO
  kind: ActivityKind;
  device_id?: string | null;
  actor?: string | null; // user email / system
  summary: string;
  meta?: Record<string, any> | null;
};

function fmtTime(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

export default function ActivityClient() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ActivityRow[]>([]);

  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/control/activity", window.location.origin);
      if (kind !== "all") url.searchParams.set("kind", kind);
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
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (!term) return true;
      const hay = `${r.kind} ${r.device_id ?? ""} ${r.actor ?? ""} ${r.summary}`.toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q, kind]);

  return (
    <div className="space-y-4">
      <div className="hi5-panel p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <div className="text-xs opacity-70 mb-1">Search</div>
            <input className="hi5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity…" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:w-[520px]">
            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Kind</div>
              <select className="hi5-input" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">All</option>
                <option value="device_checkin">device_checkin</option>
                <option value="job_created">job_created</option>
                <option value="job_result">job_result</option>
                <option value="service_action">service_action</option>
                <option value="terminal_opened">terminal_opened</option>
                <option value="file_download">file_download</option>
                <option value="file_upload">file_upload</option>
                <option value="auth">auth</option>
                <option value="other">other</option>
              </select>
            </label>

            <div className="hidden sm:block">
              <div className="text-xs opacity-70 mb-1">Actions</div>
              <div className="flex gap-2">
                <button className="hi5-btn-ghost text-sm flex-1" type="button" onClick={load} disabled={loading}>
                  Refresh
                </button>
                <Link href="/control/jobs" className="hi5-btn-primary text-sm flex-1 text-center">
                  Jobs
                </Link>
              </div>
            </div>
          </div>
        </div>

        {err ? <div className="mt-3 text-sm text-red-300">{err}</div> : null}
        {loading ? <div className="mt-2 text-xs opacity-70">Loading…</div> : null}

        <div className="mt-3 text-xs opacity-70">
          Showing <span className="font-semibold">{filtered.length}</span> events.
        </div>
      </div>

      <div className="hi5-panel p-4">
        {filtered.length === 0 ? (
          <div className="text-sm opacity-70">No activity yet (or backend not wired).</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="hi5-panel p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs opacity-70">{fmtTime(r.ts)}</div>
                    <div className="mt-1 font-semibold">{r.summary}</div>
                    <div className="mt-1 text-xs opacity-70">
                      <span className="font-mono">{r.kind}</span>
                      {r.actor ? <> · <span className="font-mono">{r.actor}</span></> : null}
                      {r.device_id ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link className="underline" href={`/control/${encodeURIComponent(r.device_id)}?tab=overview`}>
                            {r.device_id}
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {r.device_id ? (
                    <Link
                      href={`/control/${encodeURIComponent(r.device_id)}?tab=activity`}
                      className="hi5-btn-ghost text-xs"
                    >
                      View device
                    </Link>
                  ) : null}
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
