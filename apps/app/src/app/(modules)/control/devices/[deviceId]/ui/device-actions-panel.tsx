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

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function resultOf(action: DeviceAction) {
  const r = action.result_json ?? {};
  return r.parsed && typeof r.parsed === "object" ? { ...r.parsed, ...r } : r;
}

function WindowsUpdateResult({ action }: { action: DeviceAction }) {
  const r = resultOf(action);
  const updates = asArray(r.updates);
  const results = asArray(r.results);
  const history = asArray(r.history);
  const hotfixes = asArray(r.hotfixes);
  const events = asArray(r.windows_update_events);

  if (!["scan_windows_updates", "install_windows_updates", "get_update_history"].includes(action.action_type)) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 md:grid-cols-4 text-xs">
        {typeof r.count === "number" ? <Metric label="Pending" value={String(r.count)} /> : null}
        {typeof r.selected_count === "number" ? <Metric label="Selected" value={String(r.selected_count)} /> : null}
        {r.install_result ? <Metric label="Install result" value={String(r.install_result)} /> : null}
        {typeof r.reboot_required === "boolean" ? <Metric label="Reboot required" value={r.reboot_required ? "Yes" : "No"} /> : null}
      </div>

      {updates.length > 0 ? (
        <div>
          <div className="text-xs font-semibold opacity-80">Pending updates</div>
          <div className="mt-2 overflow-auto rounded-xl border border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">KB</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Downloaded</th>
                </tr>
              </thead>
              <tbody>
                {updates.slice(0, 25).map((u, idx) => (
                  <tr key={idx} className="border-t border-white/10">
                    <td className="p-2 min-w-[260px]">{u.title || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{asArray(u.kb_articles).join(", ") || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{u.is_driver ? "Driver" : "Update"}</td>
                    <td className="p-2 whitespace-nowrap">{u.is_downloaded ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {updates.length > 25 ? <div className="mt-1 text-xs opacity-60">Showing first 25 of {updates.length} updates.</div> : null}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div>
          <div className="text-xs font-semibold opacity-80">Install results</div>
          <div className="mt-2 overflow-auto rounded-xl border border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">KB</th>
                  <th className="text-left p-2">Result</th>
                  <th className="text-left p-2">HResult</th>
                </tr>
              </thead>
              <tbody>
                {results.map((u, idx) => (
                  <tr key={idx} className="border-t border-white/10">
                    <td className="p-2 min-w-[260px]">{u.title || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{asArray(u.kb_articles).join(", ") || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{u.result || u.result_code || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{u.hresult || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div>
          <div className="text-xs font-semibold opacity-80">Recent Windows Update Agent history</div>
          <div className="mt-2 overflow-auto rounded-xl border border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Operation</th>
                  <th className="text-left p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((h, idx) => (
                  <tr key={idx} className="border-t border-white/10">
                    <td className="p-2 whitespace-nowrap">{fmtTime(h.date)}</td>
                    <td className="p-2 min-w-[260px]">{h.title || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{h.operation || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{h.result || h.result_code || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {hotfixes.length > 0 || events.length > 0 ? (
        <details className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer text-xs font-semibold opacity-80">Hotfixes and Windows Update events</summary>
          {hotfixes.length > 0 ? (
            <div className="mt-3 text-xs space-y-1">
              {hotfixes.slice(0, 15).map((h, idx) => (
                <div key={idx} className="opacity-80">{h.hotfix_id} — {h.description} — {fmtTime(h.installed_on)}</div>
              ))}
            </div>
          ) : null}
          {events.length > 0 ? (
            <div className="mt-3 text-xs space-y-1">
              {events.slice(0, 10).map((e, idx) => (
                <div key={idx} className="opacity-80">{fmtTime(e.time_created)} — Event {e.id}: {String(e.message || "").slice(0, 220)}</div>
              ))}
            </div>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}


function SoftwareUpdateResult({ action }: { action: DeviceAction }) {
  const r = resultOf(action);
  const updates = asArray(r.updates);
  const results = asArray(r.results);

  if (!["scan_software_updates", "install_software_updates"].includes(action.action_type)) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 md:grid-cols-4 text-xs">
        {typeof r.count === "number" ? <Metric label="Available" value={String(r.count)} /> : null}
        {typeof r.attempted_count === "number" ? <Metric label="Attempted" value={String(r.attempted_count)} /> : null}
        {typeof r.failed_count === "number" ? <Metric label="Failed" value={String(r.failed_count)} /> : null}
        {r.winget_version ? <Metric label="WinGet" value={String(r.winget_version)} /> : null}
      </div>

      {updates.length > 0 ? (
        <div>
          <div className="text-xs font-semibold opacity-80">Available third-party updates</div>
          <div className="mt-2 overflow-auto rounded-xl border border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Package ID</th>
                  <th className="text-left p-2">Current</th>
                  <th className="text-left p-2">Available</th>
                  <th className="text-left p-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {updates.slice(0, 50).map((u, idx) => (
                  <tr key={idx} className="border-t border-white/10">
                    <td className="p-2 min-w-[220px]">{u.name || "—"}</td>
                    <td className="p-2 whitespace-nowrap font-mono">{u.package_id || u.id || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{u.current_version || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{u.available_version || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{u.source || "winget"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {updates.length > 50 ? <div className="mt-1 text-xs opacity-60">Showing first 50 of {updates.length} software updates.</div> : null}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div>
          <div className="text-xs font-semibold opacity-80">Install results</div>
          <div className="mt-2 overflow-auto rounded-xl border border-white/10">
            <table className="min-w-full text-xs">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="text-left p-2">Package ID</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Exit</th>
                  <th className="text-left p-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                {results.map((u, idx) => (
                  <tr key={idx} className="border-t border-white/10">
                    <td className="p-2 whitespace-nowrap font-mono">{u.package_id || u.id || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{u.status || "—"}</td>
                    <td className="p-2 whitespace-nowrap">{typeof u.exit_code === "number" ? u.exit_code : "—"}</td>
                    <td className="p-2 whitespace-nowrap">{typeof u.duration_seconds === "number" ? `${u.duration_seconds}s` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {typeof r.raw_output === "string" && r.raw_output.trim() ? (
        <details className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer text-xs font-semibold opacity-80">Raw WinGet output</summary>
          <pre className="mt-3 max-h-[220px] overflow-auto rounded-xl bg-black/40 p-3 text-xs font-mono whitespace-pre-wrap">{r.raw_output}</pre>
        </details>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="opacity-60">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

export default function DeviceActionsPanel({ deviceId, online }: { deviceId: string; online?: boolean | null }) {
  const [actions, setActions] = useState<DeviceAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [command, setCommand] = useState("whoami");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [includeDrivers, setIncludeDrivers] = useState(true);
  const [includeUnknownSoftware, setIncludeUnknownSoftware] = useState(true);

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
            <button className="hi5-btn-ghost text-sm" type="button" onClick={load} disabled={loading}>Refresh</button>
            <button className="hi5-btn-ghost text-sm" type="button" onClick={() => setAutoRefresh((v) => !v)}>
              Auto-refresh: {autoRefresh ? "On" : "Off"}
            </button>
          </div>
        </div>

        {err ? <div className="mt-3 text-sm text-red-300">{err}</div> : null}

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="hi5-panel p-4">
            <div className="text-sm font-semibold">Quick actions</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="hi5-btn-primary text-sm" type="button" onClick={() => createAction("refresh_inventory")} disabled={loading}>
                Refresh inventory
              </button>
              <button className="hi5-btn-ghost text-sm" type="button" onClick={() => createAction("scan_windows_updates", { timeout_seconds: 1800 })} disabled={loading}>
                Scan Windows Updates
              </button>
              <button className="hi5-btn-ghost text-sm" type="button" onClick={() => createAction("get_update_history", { limit: 75 })} disabled={loading}>
                Update history
              </button>
              <button
                className="hi5-btn-ghost text-sm border-orange-400/30 text-orange-200"
                type="button"
                onClick={() => {
                  if (window.confirm("Install all pending Windows Updates on this device? Reboots are suppressed, but a reboot may be required afterwards.")) {
                    createAction("install_windows_updates", { install_all: true, include_drivers: includeDrivers, timeout_seconds: 7200 });
                  }
                }}
                disabled={loading}
              >
                Install all updates
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs opacity-75">
              <input type="checkbox" checked={includeDrivers} onChange={(e) => setIncludeDrivers(e.target.checked)} />
              Include driver updates during install
            </label>

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="text-xs font-semibold opacity-80">Third-party software updates</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="hi5-btn-ghost text-sm" type="button" onClick={() => createAction("scan_software_updates", { source: "winget", include_unknown: includeUnknownSoftware, timeout_seconds: 1800 })} disabled={loading}>
                  Scan software updates
                </button>
                <button
                  className="hi5-btn-ghost text-sm border-orange-400/30 text-orange-200"
                  type="button"
                  onClick={() => {
                    if (window.confirm("Install all available WinGet third-party software updates on this device? Some installers may not support fully silent upgrades.")) {
                      createAction("install_software_updates", { install_all: true, source: "winget", include_unknown: includeUnknownSoftware, timeout_seconds: 7200 });
                    }
                  }}
                  disabled={loading}
                >
                  Install software updates
                </button>
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs opacity-75">
                <input type="checkbox" checked={includeUnknownSoftware} onChange={(e) => setIncludeUnknownSoftware(e.target.checked)} />
                Include packages with unknown installed version
              </label>
            </div>

            <div className="mt-3 text-xs opacity-70">
              Windows Update and third-party software jobs run through the persistent action queue. They continue even if this page refreshes or you close the browser.
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
              <button className="hi5-btn-primary text-sm" type="button" onClick={() => createAction("run_powershell", { command, timeout_seconds: 120 })} disabled={loading || !command.trim()}>
                Queue command
              </button>
              <button className="hi5-btn-ghost text-sm" type="button" onClick={() => setCommand("whoami")}>Reset</button>
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
                      {a.payload_json?.command ? <pre className="mt-2 text-xs opacity-75 font-mono whitespace-pre-wrap break-words">{a.payload_json.command}</pre> : null}
                    </div>
                    <div className="text-xs opacity-70 whitespace-nowrap">Updated {fmtTime(a.updated_at)}</div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-white/50" style={{ width: `${Math.max(0, Math.min(100, a.progress ?? 0))}%` }} />
                  </div>

                  <WindowsUpdateResult action={a} />
                  <SoftwareUpdateResult action={a} />

                  {typeof output === "string" && output.length > 0 && !["scan_windows_updates", "install_windows_updates", "get_update_history", "scan_software_updates", "install_software_updates"].includes(a.action_type) ? (
                    <pre className="mt-3 max-h-[240px] overflow-auto rounded-xl bg-black/40 p-3 text-xs font-mono whitespace-pre-wrap">{output}</pre>
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
