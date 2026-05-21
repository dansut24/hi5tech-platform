"use client";

import { useEffect, useMemo, useState } from "react";

type DeviceAction = {
  action_id: string;
  device_id: string;
  action_type: string;
  status: string;
  progress?: number;
  message?: string;
  payload_json?: any;
  result_json?: any;
  error_message?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
};

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

function statusTone(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "failed":
      return "bg-red-500/10 text-red-300 border-red-500/20";
    case "running":
    case "sent":
      return "bg-sky-500/10 text-sky-300 border-sky-500/20";
    default:
      return "bg-white/5 text-white/75 border-white/10";
  }
}

export default function DeviceActionsPanel({ deviceId, online }: { deviceId: string; online?: boolean | null }) {
  const [actions, setActions] = useState<DeviceAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [command, setCommand] = useState("whoami");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const hasRunning = useMemo(() => actions.some((a) => ["queued", "sent", "running"].includes(a.status)), [actions]);

  async function load() {
    setErr(null);
    try {
      const res = await fetch(`/api/control/actions?device_id=${encodeURIComponent(deviceId)}&limit=50`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to load actions (${res.status})`);
      setActions(Array.isArray(data?.actions) ? data.actions : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load actions");
    }
  }

  async function createAction(actionType: string, payload: any = {}) {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/control/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, action_type: actionType, payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to create action (${res.status})`);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create action");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    if (!autoRefresh) return;
    const ms = hasRunning ? 2500 : 10000;
    const t = window.setInterval(load, ms);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, hasRunning, deviceId]);

  return (
    <div className="space-y-4">
      <div className="hi5-panel p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Device jobs</div>
            <p className="text-sm opacity-75 mt-1 max-w-3xl">
              Persistent actions sent to the agent. Jobs survive page refreshes and will be delivered when the device is online.
            </p>
            <div className="mt-2 text-xs opacity-70">Device is currently {online ? "online" : "offline"}.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="hi5-btn-ghost text-sm" type="button" onClick={load} disabled={loading}>
              Refresh
            </button>
            <button
              className="hi5-btn-ghost text-sm"
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              Auto-refresh: {autoRefresh ? "On" : "Off"}
            </button>
          </div>
        </div>

        {err ? <div className="mt-3 text-sm text-red-300">{err}</div> : null}

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="hi5-panel p-4">
            <div className="text-sm font-semibold">Quick actions</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="hi5-btn-primary text-sm"
                type="button"
                onClick={() => createAction("refresh_inventory")}
                disabled={loading}
              >
                Refresh inventory
              </button>
              <button
                className="hi5-btn-ghost text-sm"
                type="button"
                onClick={() => createAction("scan_windows_updates")}
                disabled={loading}
              >
                Scan Windows Updates
              </button>
              <button
                className="hi5-btn-ghost text-sm"
                type="button"
                onClick={() => createAction("get_update_history")}
                disabled={loading}
              >
                Update history
              </button>
            </div>
            <div className="mt-3 text-xs opacity-70">
              Pass 1 agent executes inventory refresh and PowerShell. Windows Update actions are queued now and will be wired in the next pass.
            </div>
          </div>

          <div className="hi5-panel p-4">
            <div className="text-sm font-semibold">Run PowerShell as SYSTEM</div>
            <textarea
              className="hi5-input font-mono text-sm min-h-[110px] mt-3"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Get-ComputerInfo | Select-Object CsName, OsName"
            />
            <div className="mt-3 flex gap-2">
              <button
                className="hi5-btn-primary text-sm"
                type="button"
                onClick={() => createAction("run_powershell", { command, timeout_seconds: 120 })}
                disabled={loading || !command.trim()}
              >
                Queue command
              </button>
              <button className="hi5-btn-ghost text-sm" type="button" onClick={() => setCommand("whoami")}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hi5-panel p-5">
        <div className="text-sm font-semibold">Recent actions</div>
        <div className="mt-4 space-y-2">
          {actions.length === 0 ? (
            <div className="text-sm opacity-70">No actions have been created for this device yet.</div>
          ) : (
            actions.map((a) => {
              const output = a.result_json?.output;
              return (
                <div key={a.action_id} className="hi5-panel p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs opacity-70">{fmtTime(a.created_at)}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{a.action_type}</span>
                        <span className={`text-xs border rounded-full px-2 py-0.5 ${statusTone(a.status)}`}>{a.status}</span>
                        <span className="text-xs opacity-70">{a.progress ?? 0}%</span>
                      </div>
                      {a.message ? <div className="mt-1 text-sm opacity-80">{a.message}</div> : null}
                      {a.error_message ? <div className="mt-1 text-sm text-red-300">{a.error_message}</div> : null}
                      {a.payload_json?.command ? (
                        <pre className="mt-2 text-xs opacity-75 font-mono whitespace-pre-wrap break-words">{a.payload_json.command}</pre>
                      ) : null}
                    </div>
                    <div className="text-xs opacity-70 whitespace-nowrap">Updated {fmtTime(a.updated_at)}</div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-white/50" style={{ width: `${Math.max(0, Math.min(100, a.progress ?? 0))}%` }} />
                  </div>

                  {typeof output === "string" && output.length > 0 ? (
                    <pre className="mt-3 max-h-[240px] overflow-auto rounded-xl bg-black/40 p-3 text-xs font-mono whitespace-pre-wrap">
                      {output}
                    </pre>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
