"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ApiDevice = {
  device_id: string;
  hostname: string;
  os: string;
  online?: boolean;
  last_seen_at?: string;
};

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

type JobRow = {
  id: string;
  created_at: string;
  status: JobStatus;
  kind: "command";
  command: string;
  targets: { device_id: string; hostname?: string }[];
};

function fmtTime(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

export default function JobsClient() {
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // create form
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [command, setCommand] = useState("whoami");

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const [devRes, jobRes] = await Promise.all([
        fetch("/api/control/devices", { headers: { "X-Tenant-ID": "tnt_demo" }, cache: "no-store" }),
        fetch("/api/control/jobs", { headers: { "X-Tenant-ID": "tnt_demo" }, cache: "no-store" }),
      ]);

      if (!devRes.ok) throw new Error(`${devRes.status} ${devRes.statusText}`);
      if (!jobRes.ok) throw new Error(`${jobRes.status} ${jobRes.statusText}`);

      const devData = await devRes.json();
      const devList = Array.isArray(devData) ? devData : (devData?.devices ?? []);
      setDevices(devList as ApiDevice[]);

      const jobData = await jobRes.json();
      setJobs(Array.isArray(jobData?.jobs) ? jobData.jobs : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredDevices = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return devices;
    return devices.filter((d) => {
      const hay = `${d.hostname} ${d.device_id} ${d.os}`.toLowerCase();
      return hay.includes(term);
    });
  }, [devices, q]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  function toggle(id: string) {
    setSelected((m) => ({ ...m, [id]: !m[id] }));
  }

  function selectAllVisible() {
    setSelected((m) => {
      const next = { ...m };
      for (const d of filteredDevices) next[d.device_id] = true;
      return next;
    });
  }

  function clearSelection() {
    setSelected({});
  }

  async function createJob() {
    if (!command.trim()) return;
    if (selectedIds.length === 0) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/control/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": "tnt_demo",
        },
        body: JSON.stringify({
          kind: "command",
          command: command.trim(),
          targets: selectedIds.map((id) => ({ device_id: id })),
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`);
      }

      clearSelection();
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create job (backend not wired yet).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {err ? <div className="text-sm text-red-300">{err}</div> : null}
      {loading ? <div className="text-xs opacity-70">Loading…</div> : null}

      {/* Create Job */}
      <div className="hi5-panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Create command job</div>
            <div className="text-xs opacity-70 mt-1">Select devices, enter a command, run once.</div>
          </div>
          <div className="flex gap-2">
            <button className="hi5-btn-ghost text-sm" type="button" onClick={loadAll} disabled={loading}>
              Refresh
            </button>
            <Link href="/control/devices" className="hi5-btn-ghost text-sm">
              Devices
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="hi5-panel p-4">
            <div className="text-xs opacity-70 mb-1">Device search</div>
            <input className="hi5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search devices…" />

            <div className="mt-3 flex gap-2">
              <button className="hi5-btn-ghost text-sm" type="button" onClick={selectAllVisible}>
                Select visible
              </button>
              <button className="hi5-btn-ghost text-sm" type="button" onClick={clearSelection}>
                Clear
              </button>
              <div className="flex-1" />
              <div className="text-xs opacity-70 self-center">
                Selected: <span className="font-semibold">{selectedIds.length}</span>
              </div>
            </div>

            <div className="mt-3 space-y-2 max-h-[360px] overflow-auto pr-1">
              {filteredDevices.length === 0 ? (
                <div className="text-sm opacity-70">No devices.</div>
              ) : (
                filteredDevices.map((d) => (
                  <button
                    key={d.device_id}
                    type="button"
                    onClick={() => toggle(d.device_id)}
                    className={[
                      "w-full text-left hi5-panel p-3 transition",
                      selected[d.device_id] ? "ring-2 ring-[rgba(var(--hi5-accent),0.30)]" : "hover:bg-black/5 dark:hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{d.hostname || d.device_id}</div>
                        <div className="text-xs opacity-70 mt-1 font-mono truncate">{d.device_id}</div>
                        <div className="text-xs opacity-70 mt-1">{d.os}</div>
                      </div>
                      <div className="text-xs font-semibold opacity-70">{d.online ? "Online" : "Offline"}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="hi5-panel p-4">
            <div className="text-xs opacity-70 mb-1">Command</div>
            <textarea
              className="hi5-input font-mono text-sm min-h-[140px]"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. whoami"
            />
            <div className="mt-3 text-xs opacity-70">
              Backend plan: jobs are stored in Postgres, agents poll pending jobs, then report results → Activity log.
            </div>

            <div className="mt-3 flex gap-2">
              <button
                className="hi5-btn-primary text-sm"
                type="button"
                onClick={createJob}
                disabled={loading || selectedIds.length === 0 || !command.trim()}
              >
                Run on {selectedIds.length || 0} device(s)
              </button>
              <button className="hi5-btn-ghost text-sm" type="button" onClick={() => setCommand("whoami")}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="hi5-panel p-5">
        <div className="text-sm font-semibold">Recent jobs</div>
        <div className="text-xs opacity-70 mt-1">This list will become your automation history.</div>

        <div className="mt-4 space-y-2">
          {jobs.length === 0 ? (
            <div className="text-sm opacity-70">No jobs yet (or backend not wired).</div>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="hi5-panel p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs opacity-70">{fmtTime(j.created_at)}</div>
                    <div className="mt-1 font-semibold">
                      {j.kind.toUpperCase()} · <span className="font-mono text-sm">{j.status}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-70 font-mono whitespace-pre-wrap break-words">{j.command}</div>
                    <div className="mt-2 text-xs opacity-70">
                      Targets: <span className="font-semibold">{j.targets?.length ?? 0}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link href="/control/activity" className="hi5-btn-ghost text-xs text-center">
                      View activity
                    </Link>
                    {j.targets?.[0]?.device_id ? (
                      <Link
                        href={`/control/${encodeURIComponent(j.targets[0].device_id)}?tab=terminal`}
                        className="hi5-btn-ghost text-xs text-center"
                      >
                        Open device
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
