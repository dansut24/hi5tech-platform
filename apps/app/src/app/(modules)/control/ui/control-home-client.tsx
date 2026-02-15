"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RangeKey = "24h" | "7d" | "30d";

type ApiDevice = {
  device_id: string;
  hostname: string;
  os: string;
  arch?: string;
  last_seen_at?: string;
  online?: boolean;
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="hi5-panel p-5">
      <div className="text-xs opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-2 text-xs opacity-70">{hint}</div> : null}
    </div>
  );
}

function prettyOs(osRaw: string) {
  const v = String(osRaw || "").toLowerCase();
  if (v === "windows") return "Windows";
  if (v === "linux") return "Linux";
  if (v === "darwin" || v === "mac" || v === "macos") return "macOS";
  return osRaw ? osRaw[0].toUpperCase() + osRaw.slice(1) : "Unknown";
}

function parseIsoMs(iso?: string) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function formatLastSeen(iso?: string) {
  const t = parseIsoMs(iso);
  if (!t) return "—";
  const diffMs = Date.now() - t;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 30) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

function rangeMs(range: RangeKey) {
  if (range === "24h") return 24 * 60 * 60 * 1000;
  if (range === "7d") return 7 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="opacity-80">{label}</div>
        <div className="opacity-70 font-mono">
          {value} ({pct}%)
        </div>
      </div>
      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-[rgba(var(--hi5-accent),0.45)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ControlHomeClient() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/control/devices", {
          headers: { "X-Tenant-ID": "tnt_demo" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const data = (await res.json()) as unknown;
        const list = Array.isArray(data) ? (data as ApiDevice[]) : ((data as any)?.devices ?? []);
        if (!cancelled) setDevices(list as ApiDevice[]);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load devices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const computed = useMemo(() => {
    const now = Date.now();
    const cutoff = now - rangeMs(range);

    const total = devices.length;
    const online = devices.filter((d) => !!d.online).length;
    const offline = total - online;

    const recentlySeen = devices.filter((d) => {
      const t = parseIsoMs(d.last_seen_at);
      return t !== null && t >= cutoff;
    }).length;

    const byOsMap = new Map<string, number>();
    for (const d of devices) {
      const k = prettyOs(d.os || "unknown");
      byOsMap.set(k, (byOsMap.get(k) ?? 0) + 1);
    }

    const byOs = Array.from(byOsMap.entries())
      .map(([k, v]) => ({ k, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 6);

    const recent = [...devices]
      .sort((a, b) => (parseIsoMs(b.last_seen_at) ?? 0) - (parseIsoMs(a.last_seen_at) ?? 0))
      .slice(0, 8);

    const flapping = devices
      .filter((d) => !d.online && (parseIsoMs(d.last_seen_at) ?? 0) >= cutoff)
      .sort((a, b) => (parseIsoMs(b.last_seen_at) ?? 0) - (parseIsoMs(a.last_seen_at) ?? 0))
      .slice(0, 6);

    return { total, online, offline, recentlySeen, byOs, recent, flapping };
  }, [devices, range]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Control</h1>
          <p className="text-sm opacity-75 mt-1">Live device inventory + jobs + audit trail — RMM workflow ready.</p>
          {err ? <div className="mt-2 text-sm text-red-300">{err}</div> : null}
          {loading ? <div className="mt-1 text-xs opacity-70">Loading devices…</div> : null}
        </div>

        <div className="flex gap-2">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={[
                "rounded-2xl px-3 py-2 text-sm transition",
                "hi5-btn-ghost",
                range === r ? "ring-2 ring-[rgba(var(--hi5-accent),0.35)]" : "",
              ].join(" ")}
              type="button"
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total devices" value={String(computed.total)} hint="Registered to this tenant" />
        <StatCard label="Online now" value={String(computed.online)} hint="Reachable agents" />
        <StatCard label="Offline" value={String(computed.offline)} hint="Not connected" />
        <StatCard label="Seen recently" value={String(computed.recentlySeen)} hint={`Seen within ${range.toUpperCase()}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hi5-panel p-5">
          <div className="text-sm font-semibold">Status breakdown</div>
          <div className="text-xs opacity-70 mt-1">Live online flag from agent heartbeat.</div>
          <div className="mt-4 space-y-3">
            <Bar label="Online" value={computed.online} total={computed.total} />
            <Bar label="Offline" value={computed.offline} total={computed.total} />
          </div>
          <div className="mt-4 text-xs opacity-70">“Seen recently” helps spot flapping agents.</div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-sm font-semibold">OS mix</div>
          <div className="text-xs opacity-70 mt-1">Top OS values reported by agents.</div>
          <div className="mt-4 space-y-3">
            {computed.byOs.length === 0 ? (
              <div className="text-sm opacity-70">No device data yet.</div>
            ) : (
              computed.byOs.map((x) => <Bar key={x.k} label={x.k} value={x.v} total={computed.total} />)
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hi5-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Quick actions</div>
              <div className="text-xs opacity-70 mt-1">The “RMM” bits you’ll use daily.</div>
            </div>
            <div className="flex gap-2">
              <Link href="/control/jobs" className="hi5-btn-primary text-sm">
                Create job
              </Link>
              <Link href="/control/devices" className="hi5-btn-ghost text-sm">
                View devices
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Link href="/control/jobs" className="hi5-btn-ghost text-sm text-center">
              Jobs (commands)
            </Link>
            <Link href="/control/activity" className="hi5-btn-ghost text-sm text-center">
              Activity log
            </Link>
            <div className="hi5-btn-ghost text-sm text-center opacity-60 cursor-not-allowed" title="Coming soon">
              Policies (soon)
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold">Offline but seen recently</div>
            <div className="text-xs opacity-70 mt-1">Good for finding unstable or sleeping endpoints.</div>

            <div className="mt-3 space-y-2">
              {computed.flapping.length === 0 ? (
                <div className="text-sm opacity-70">None.</div>
              ) : (
                computed.flapping.map((d) => (
                  <Link
                    key={d.device_id}
                    href={`/control/${encodeURIComponent(d.device_id)}?tab=overview`}
                    className="block hi5-panel p-3 hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{d.hostname || d.device_id}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {prettyOs(d.os)} · <span className="font-mono">{d.device_id}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold opacity-70">Offline</div>
                        <div className="text-xs opacity-70 mt-1">{formatLastSeen(d.last_seen_at)}</div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-sm font-semibold">Recent check-ins</div>
          <div className="text-xs opacity-70 mt-1">Newest last_seen_at first.</div>

          <div className="mt-3 space-y-2">
            {computed.recent.length === 0 ? (
              <div className="text-sm opacity-70">No devices found yet.</div>
            ) : (
              computed.recent.map((d) => (
                <Link
                  key={d.device_id}
                  href={`/control/${encodeURIComponent(d.device_id)}?tab=overview`}
                  className="block hi5-panel p-3 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{d.hostname || d.device_id}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {prettyOs(d.os)}{d.arch ? ` · ${d.arch}` : ""} · ID:{" "}
                        <span className="font-mono">{d.device_id}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={["text-xs font-semibold", d.online ? "text-[rgba(var(--hi5-accent),0.95)]" : "opacity-70"].join(" ")}>
                        {d.online ? "Online" : "Offline"}
                      </div>
                      <div className="text-xs opacity-70 mt-1">{formatLastSeen(d.last_seen_at)}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
