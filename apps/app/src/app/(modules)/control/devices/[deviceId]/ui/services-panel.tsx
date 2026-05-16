"use client";

import { useEffect, useMemo, useState } from "react";

type ServiceStatus = "running" | "stopped" | "unknown";

type ApiService = {
  name: string;            // internal service name
  display_name?: string;   // friendly display name
  status: ServiceStatus;
  startup_type?: string;   // auto/manual/disabled
};

type ListResponse = {
  services: ApiService[];
};

type Action = "start" | "stop" | "restart";

function badgeClass(status: ServiceStatus) {
  if (status === "running") return "bg-[rgba(var(--hi5-accent),0.14)] border-[rgba(var(--hi5-accent),0.28)]";
  if (status === "stopped") return "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10";
  return "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10";
}

export default function ServicesPanel({ deviceId }: { deviceId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ApiService[]>([]);
  const [busy, setBusy] = useState<Record<string, Action | null>>({});

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/control/services?device_id=${encodeURIComponent(deviceId)}`, {
        headers: {
          // TEMP until real auth wiring
          "X-Tenant-ID": "tnt_demo",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`);
      }

      const data = (await res.json()) as ListResponse;
      setRows(Array.isArray(data?.services) ? data.services : []);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message ?? "Failed to load services (backend not wired yet).");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(name: string, action: Action) {
    setErr(null);
    setBusy((m) => ({ ...m, [name]: action }));
    try {
      const res = await fetch(`/api/control/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TEMP until real auth wiring
          "X-Tenant-ID": "tnt_demo",
        },
        body: JSON.stringify({ device_id: deviceId, name, action }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`);
      }

      // After action, refresh list (so status updates once backend exists)
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Service action failed (backend not wired yet).");
    } finally {
      setBusy((m) => ({ ...m, [name]: null }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((s) => {
      const hay = `${s.name} ${s.display_name ?? ""} ${s.status} ${s.startup_type ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Services</div>
          <p className="text-sm opacity-75 mt-1">
            UI is ready. Next step: wire <span className="font-mono">/api/control/services</span> to your Go control
            server (list + start/stop/restart).
          </p>
        </div>

        <button className="hi5-btn-ghost text-sm" type="button" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}

      <div className="hi5-panel p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <div className="text-xs opacity-70 mb-1">Search services</div>
            <input
              className="hi5-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, display name, status..."
            />
          </div>

          <div className="text-xs opacity-70">
            Showing <span className="font-semibold">{filtered.length}</span>{" "}
            <span className="opacity-70">of</span>{" "}
            <span className="font-semibold">{rows.length}</span>
          </div>
        </div>
      </div>

      <div className="hi5-panel p-4">
        {loading && rows.length === 0 ? (
          <div className="text-sm opacity-70">Loading services…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm opacity-70">No services to show (or backend not wired yet).</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const isBusy = !!busy[s.name];
              return (
                <div key={s.name} className="hi5-panel p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold truncate">
                          {s.display_name || s.name}
                        </div>

                        <span
                          className={[
                            "text-[11px] px-2 py-0.5 rounded-full border",
                            badgeClass(s.status),
                          ].join(" ")}
                        >
                          {s.status}
                        </span>

                        {s.startup_type ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 opacity-80">
                            {s.startup_type}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-[11px] opacity-70 font-mono mt-1 truncate">
                        {s.name}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className="hi5-btn-ghost text-xs"
                        type="button"
                        onClick={() => runAction(s.name, "start")}
                        disabled={isBusy || s.status === "running"}
                        title={s.status === "running" ? "Already running" : "Start"}
                      >
                        Start
                      </button>
                      <button
                        className="hi5-btn-ghost text-xs"
                        type="button"
                        onClick={() => runAction(s.name, "stop")}
                        disabled={isBusy || s.status === "stopped"}
                        title={s.status === "stopped" ? "Already stopped" : "Stop"}
                      >
                        Stop
                      </button>
                      <button
                        className="hi5-btn-primary text-xs"
                        type="button"
                        onClick={() => runAction(s.name, "restart")}
                        disabled={isBusy}
                      >
                        Restart
                      </button>
                    </div>
                  </div>

                  {isBusy ? (
                    <div className="mt-2 text-xs opacity-70">
                      Running action: <span className="font-semibold">{busy[s.name]}</span>…
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
