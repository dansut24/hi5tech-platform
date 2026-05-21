"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Network,
  RefreshCw,
  Router,
  Server,
  Wifi,
  XCircle,
} from "lucide-react";

type DiagnosticsPayload = {
  ok?: boolean;
  generatedAt?: string;
  totalMs?: number;
  app?: any;
  control?: {
    ok: boolean;
    url: string;
    status?: number;
    appToControlMs: number;
    error?: string;
    body?: any;
  };
};

type LoadState = "idle" | "loading" | "ok" | "error";

function fmtMs(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1000) return `${n.toFixed(n < 10 ? 1 : 0)} ms`;
  return `${(n / 1000).toFixed(2)} s`;
}

function fmtSeconds(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n < 60) return `${Math.round(n)}s`;
  if (n < 3600) return `${Math.floor(n / 60)}m ${Math.round(n % 60)}s`;
  if (n < 86400) return `${Math.floor(n / 3600)}h ${Math.floor((n % 3600) / 60)}m`;
  return `${Math.floor(n / 86400)}d ${Math.floor((n % 86400) / 3600)}h`;
}

function fmtBytes(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtDate(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusTone(ok?: boolean) {
  if (ok === true) return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  if (ok === false) return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200";
  return "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border hi5-border bg-white/80 p-4 shadow-sm dark:bg-slate-950/60">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {icon ? <div className="rounded-xl border hi5-border bg-slate-50 p-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{icon}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className={`rounded-xl border hi5-border bg-slate-50 p-3 dark:bg-slate-900/70 ${tone ?? ""}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function Pill({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  const Icon = ok === true ? CheckCircle2 : ok === false ? XCircle : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(ok)}`}>
      <Icon size={14} />
      {children}
    </span>
  );
}

export default function PerformanceDiagnosticsClient() {
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setState((prev) => (prev === "idle" ? "loading" : prev));
    setError(null);

    try {
      const res = await fetch(`/api/control/diagnostics?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Diagnostics API HTTP ${res.status}`);
      setData(json);
      setState("ok");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to load diagnostics");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(id);
  }, [autoRefresh, load]);

  const control = data?.control?.body;
  const controlOk = data?.control?.ok === true && control?.database?.ok !== false;
  const ws = control?.websockets ?? {};
  const db = control?.database ?? {};
  const processInfo = control?.process ?? {};
  const memory = control?.memory ?? {};
  const app = data?.app ?? {};

  const latestStreams = useMemo(() => (Array.isArray(control?.latest_stream) ? control.latest_stream : []), [control]);
  const latestEncoders = useMemo(() => (Array.isArray(control?.latest_encoder) ? control.latest_encoder : []), [control]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 rounded-3xl border hi5-border bg-white/80 p-5 shadow-sm dark:bg-slate-950/60 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill ok={controlOk}>{controlOk ? "Control server healthy" : "Needs attention"}</Pill>
            <span className="text-xs text-slate-500 dark:text-slate-400">Last checked {fmtDate(data?.generatedAt)}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Performance diagnostics</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Live timing for the Vercel app, control server, database, WebSocket connections, active sessions, and stream telemetry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className="rounded-xl border hi5-border px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            Auto-refresh: {autoRefresh ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <RefreshCw size={16} className={state === "loading" ? "animate-spin" : ""} />
            Refresh now
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="App → control" value={fmtMs(data?.control?.appToControlMs)} tone={Number(data?.control?.appToControlMs) > 600 ? "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30" : undefined} />
        <Stat label="Control request" value={fmtMs(control?.request_ms)} />
        <Stat label="Database ping" value={fmtMs(db?.ping_ms)} tone={db?.ok === false ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30" : undefined} />
        <Stat label="Active viewers" value={ws?.viewers_active ?? "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Control server" subtitle={processInfo?.hostname ?? "Runtime and process health"} icon={<Server size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Uptime" value={fmtSeconds(processInfo?.uptime_sec)} />
            <Stat label="Goroutines" value={processInfo?.goroutines ?? "—"} />
            <Stat label="Go" value={processInfo?.go_version ?? "—"} />
            <Stat label="CPU cores" value={processInfo?.cpu_count ?? "—"} />
            <Stat label="Heap alloc" value={fmtBytes(memory?.heap_alloc_bytes)} />
            <Stat label="System memory" value={fmtBytes(memory?.sys_bytes)} />
          </div>
        </Card>

        <Card title="Database" subtitle="Postgres connection pool and latency" icon={<Database size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Status" value={db?.ok ? "OK" : db?.error || "Failed"} tone={db?.ok ? undefined : "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"} />
            <Stat label="Ping" value={fmtMs(db?.ping_ms)} />
            <Stat label="Open conns" value={db?.open_connections ?? "—"} />
            <Stat label="In use / idle" value={`${db?.in_use ?? "—"} / ${db?.idle ?? "—"}`} />
            <Stat label="Wait count" value={db?.wait_count ?? "—"} />
            <Stat label="Wait duration" value={fmtMs(db?.wait_duration_ms)} />
          </div>
        </Card>

        <Card title="WebSockets / signalling" subtitle="Agent, viewer and session queue state" icon={<Wifi size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Agents online" value={ws?.agents_online ?? "—"} />
            <Stat label="Stale agents" value={ws?.agents_stale_over_120s ?? "—"} />
            <Stat label="Remote sessions" value={ws?.remote_sessions ?? "—"} />
            <Stat label="Viewers active" value={ws?.viewers_active ?? "—"} />
            <Stat label="Pending offers" value={ws?.pending_offers ?? "—"} />
            <Stat label="Pending ICE" value={ws?.pending_ice_candidates ?? "—"} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="App / Vercel runtime" subtitle="Useful for spotting app-side latency" icon={<Router size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Total route time" value={fmtMs(data?.totalMs)} />
            <Stat label="Node" value={app?.nodeVersion ?? "—"} />
            <Stat label="Vercel region" value={app?.deployment?.region ?? "—"} />
            <Stat label="Environment" value={app?.deployment?.environment ?? "—"} />
            <Stat label="Heap used" value={fmtBytes(app?.memory?.heapUsedBytes)} />
            <Stat label="RSS" value={fmtBytes(app?.memory?.rssBytes)} />
          </div>
        </Card>

        <Card title="Current endpoint" subtitle="The control server base URL currently used by the app" icon={<Network size={18} />}>
          <div className="rounded-xl border hi5-border bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <div className="font-semibold text-slate-950 dark:text-white">{data?.control?.url ?? "—"}</div>
            {data?.control?.error ? <div className="mt-2 text-red-600 dark:text-red-300">{data.control.error}</div> : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Stat label="HTTP status" value={data?.control?.status ?? "—"} />
              <Stat label="Public base" value={processInfo?.public_base ?? "—"} />
            </div>
          </div>
        </Card>
      </div>

      <Card title="Latest stream diagnostics" subtitle="Last agent stream messages received by the control server" icon={<Activity size={18} />}>
        {latestStreams.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No stream diagnostics received yet. Start a remote session and open the viewer Session info panel.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Received</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Session</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">FPS</th>
                  <th className="px-3 py-2">Changed/skipped</th>
                  <th className="px-3 py-2">Desktop</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {latestStreams.map((row: any) => {
                  const p = row.payload ?? {};
                  return (
                    <tr key={`${row.session_id}-${row.received_at}`}>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.received_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.device_id || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{row.session_id}</td>
                      <td className="px-3 py-2">{p.mode ?? "—"}</td>
                      <td className="px-3 py-2">{p.target_fps ?? "—"}</td>
                      <td className="px-3 py-2">{p.changed_frames ?? "—"} / {p.skipped_frames ?? "—"}</td>
                      <td className="px-3 py-2">{p.active_desktop ?? p.source ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Latest encoder diagnostics" subtitle="Encode/send timing from the agent streamer" icon={<Clock3 size={18} />}>
        {latestEncoders.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No encoder diagnostics received yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Received</th>
                  <th className="px-3 py-2">Codec</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Frames</th>
                  <th className="px-3 py-2">Encode avg/max</th>
                  <th className="px-3 py-2">Send avg/max</th>
                  <th className="px-3 py-2">Bitrate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {latestEncoders.map((row: any) => {
                  const p = row.payload ?? {};
                  return (
                    <tr key={`${row.session_id}-${row.received_at}`}>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.received_at)}</td>
                      <td className="px-3 py-2">{p.codec ?? "—"}</td>
                      <td className="px-3 py-2">{p.profile ?? "—"}</td>
                      <td className="px-3 py-2">{p.encoded_frames ?? "—"} / {p.sent_frames ?? "—"}</td>
                      <td className="px-3 py-2">{fmtMs(p.encode_avg_ms)} / {fmtMs(p.encode_max_ms)}</td>
                      <td className="px-3 py-2">{fmtMs(p.send_avg_ms)} / {fmtMs(p.send_max_ms)}</td>
                      <td className="px-3 py-2">{p.bitrate_kbps ? `${p.bitrate_kbps} kbps` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
