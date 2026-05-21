"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const SNIPPETS = [
  {
    label: "Who am I?",
    command: "whoami /all",
  },
  {
    label: "Computer summary",
    command:
      "Get-ComputerInfo | Select-Object CsName, OsName, OsDisplayVersion, OsBuildNumber, CsManufacturer, CsModel | Format-List",
  },
  {
    label: "IP config",
    command: "Get-NetIPConfiguration | Format-List",
  },
  {
    label: "Top processes",
    command:
      "Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name,Id,CPU,WorkingSet64 | Format-Table -AutoSize",
  },
  {
    label: "Services stopped/auto",
    command:
      "Get-CimInstance Win32_Service | Where-Object { $_.StartMode -eq 'Auto' -and $_.State -ne 'Running' } | Select-Object Name,DisplayName,State,StartMode | Format-Table -AutoSize",
  },
  {
    label: "Pending reboot check",
    command:
      "$paths=@('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing\\RebootPending','HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired','HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager'); foreach($p in $paths){ if(Test-Path $p){ Write-Host \"FOUND: $p\" } }",
  },
];

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

function statusTone(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
    case "failed":
      return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-200";
    case "running":
    case "sent":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200";
    case "queued":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200";
    default:
      return "hi5-border bg-black/5 dark:bg-white/5";
  }
}

function normaliseOutput(action?: DeviceAction | null) {
  if (!action) return "";

  const parts: string[] = [];

  if (action.message) {
    parts.push(`[${action.status}] ${action.message}`);
  }

  if (action.error_message) {
    parts.push(`ERROR:\n${action.error_message}`);
  }

  const result = action.result_json;
  if (result) {
    if (typeof result.output === "string" && result.output.trim()) {
      parts.push(result.output);
    }

    if (typeof result.stderr === "string" && result.stderr.trim()) {
      parts.push(`STDERR:\n${result.stderr}`);
    }

    if (typeof result.exit_code !== "undefined") {
      parts.push(`\nExit code: ${result.exit_code}`);
    }

    if (!result.output && !result.stderr && typeof result === "object") {
      parts.push(JSON.stringify(result, null, 2));
    }
  }

  if (!parts.length && action.payload_json?.command) {
    parts.push("Command queued. Waiting for agent output...");
  }

  return parts.join("\n\n");
}

function shortCommand(command: string) {
  const oneLine = command.replace(/\s+/g, " ").trim();
  return oneLine.length > 90 ? `${oneLine.slice(0, 90)}…` : oneLine;
}

export default function TerminalPanel({ deviceId }: { deviceId: string }) {
  const [actions, setActions] = useState<DeviceAction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [command, setCommand] = useState("whoami");
  const [timeoutSeconds, setTimeoutSeconds] = useState(120);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const outputRef = useRef<HTMLPreElement | null>(null);

  const terminalActions = useMemo(
    () => actions.filter((a) => a.action_type === "run_powershell"),
    [actions],
  );

  const selectedAction = useMemo(() => {
    if (!terminalActions.length) return null;
    return terminalActions.find((a) => a.action_id === selectedId) ?? terminalActions[0] ?? null;
  }, [terminalActions, selectedId]);

  const hasRunning = useMemo(
    () => terminalActions.some((a) => ["queued", "sent", "running"].includes(a.status)),
    [terminalActions],
  );

  const output = normaliseOutput(selectedAction);

  async function load() {
    setErr(null);
    try {
      const res = await fetch(`/api/control/actions?device_id=${encodeURIComponent(deviceId)}&limit=75`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to load terminal actions (${res.status})`);
      const next = Array.isArray(data?.actions) ? data.actions : [];
      setActions(next);

      if (!selectedId) {
        const latestTerminal = next.find((a: DeviceAction) => a.action_type === "run_powershell");
        if (latestTerminal?.action_id) setSelectedId(latestTerminal.action_id);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load terminal actions");
    }
  }

  async function runCommand() {
    const trimmed = command.trim();
    if (!trimmed) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/control/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          action_type: "run_powershell",
          payload: {
            command: trimmed,
            timeout_seconds: Math.max(10, Math.min(3600, Number(timeoutSeconds) || 120)),
            source: "portal_terminal",
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed to queue command (${res.status})`);

      const id = data?.action?.action_id || data?.action_id || data?.id || null;
      if (id) setSelectedId(id);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to queue command");
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
    const t = window.setInterval(load, hasRunning ? 2000 : 8000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, hasRunning, deviceId, selectedId]);

  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [output, selectedAction?.status]);

  return (
    <div className="space-y-4">
      <div className="hi5-panel p-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Terminal</div>
            <p className="text-sm opacity-75 mt-1 max-w-3xl">
              Run audited PowerShell commands through the agent action queue. This first terminal pass is command-based rather than fully interactive, so output survives page refreshes and is kept in the device job history.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="hi5-btn-ghost text-sm" type="button" onClick={load} disabled={loading}>
              Refresh
            </button>
            <button className="hi5-btn-ghost text-sm" type="button" onClick={() => setAutoRefresh((v) => !v)}>
              Auto-refresh: {autoRefresh ? "On" : "Off"}
            </button>
          </div>
        </div>

        {err ? <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-200">{err}</div> : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="hi5-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">PowerShell as SYSTEM</div>
              <div className="text-xs opacity-65">Timeout {timeoutSeconds}s</div>
            </div>
            <textarea
              className="hi5-input mt-3 min-h-[180px] font-mono text-sm"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter a PowerShell command..."
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  runCommand();
                }
              }}
            />
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <button className="hi5-btn-primary text-sm" type="button" onClick={runCommand} disabled={loading || !command.trim()}>
                {loading ? "Queueing…" : "Run command"}
              </button>
              <button className="hi5-btn-ghost text-sm" type="button" onClick={() => setCommand("")}>Clear</button>
              <label className="flex items-center gap-2 text-xs opacity-75">
                Timeout
                <input
                  className="hi5-input w-24 text-xs"
                  type="number"
                  min={10}
                  max={3600}
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value) || 120)}
                />
                sec
              </label>
              <div className="text-xs opacity-60 sm:ml-auto">Ctrl+Enter runs the command</div>
            </div>
          </div>

          <div className="hi5-panel p-4">
            <div className="text-sm font-semibold">Quick snippets</div>
            <div className="mt-3 grid gap-2">
              {SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  className="hi5-btn-ghost text-left text-xs"
                  type="button"
                  onClick={() => setCommand(s.command)}
                  title={s.command}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hi5-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Command history</div>
            <div className="text-xs opacity-60">{terminalActions.length}</div>
          </div>
          <div className="mt-3 max-h-[520px] overflow-auto space-y-2 pr-1">
            {terminalActions.length === 0 ? (
              <div className="text-sm opacity-70">No terminal commands have been run on this device yet.</div>
            ) : (
              terminalActions.map((a) => (
                <button
                  key={a.action_id}
                  className={`w-full rounded-2xl border p-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5 ${
                    selectedAction?.action_id === a.action_id ? "border-sky-500/40 bg-sky-500/10" : "hi5-border bg-black/5 dark:bg-white/5"
                  }`}
                  type="button"
                  onClick={() => setSelectedId(a.action_id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusTone(a.status)}`}>{a.status}</span>
                    <span className="text-[11px] opacity-60">{a.progress ?? 0}%</span>
                  </div>
                  <div className="mt-2 text-xs font-mono opacity-90 break-words">
                    {shortCommand(String(a.payload_json?.command || "PowerShell command"))}
                  </div>
                  <div className="mt-2 text-[11px] opacity-55">{fmtTime(a.created_at)}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="hi5-panel overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 border-b hi5-border p-4">
            <div>
              <div className="text-sm font-semibold">Output</div>
              {selectedAction ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-75">
                  <span>{fmtTime(selectedAction.created_at)}</span>
                  <span className={`rounded-full border px-2 py-0.5 ${statusTone(selectedAction.status)}`}>{selectedAction.status}</span>
                  <span>{selectedAction.progress ?? 0}%</span>
                  {selectedAction.completed_at ? <span>Completed {fmtTime(selectedAction.completed_at)}</span> : null}
                </div>
              ) : (
                <div className="mt-1 text-xs opacity-65">Run a command to see output here.</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="hi5-btn-ghost text-xs"
                type="button"
                disabled={!output}
                onClick={() => navigator.clipboard?.writeText(output)}
              >
                Copy output
              </button>
              <button
                className="hi5-btn-ghost text-xs"
                type="button"
                disabled={!selectedAction?.payload_json?.command}
                onClick={() => setCommand(String(selectedAction?.payload_json?.command || ""))}
              >
                Reuse command
              </button>
            </div>
          </div>

          {selectedAction?.payload_json?.command ? (
            <div className="border-b hi5-border bg-black/5 p-4 dark:bg-white/5">
              <div className="text-xs opacity-60">Command</div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">{selectedAction.payload_json.command}</pre>
            </div>
          ) : null}

          <pre
            ref={outputRef}
            className="min-h-[420px] max-h-[620px] overflow-auto bg-[#05070c] p-4 text-xs leading-5 text-emerald-100 font-mono whitespace-pre-wrap"
          >
            {output || "No output selected."}
          </pre>
        </div>
      </div>
    </div>
  );
}
