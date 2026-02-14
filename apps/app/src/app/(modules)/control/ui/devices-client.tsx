// apps/app/src/app/(modules)/control/ui/devices-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import StatCards from "./stat-cards";
import DeviceTable from "./device-table";
import DeviceDetailsPanel from "./device-details-panel";
import { type DeviceRow } from "./device-data";
import EnrollmentPackagesModal from "./enrollment-packages-modal";

type Filter = "all" | "online" | "offline" | "warning";

type ApiDevice = {
  device_id: string;
  hostname: string;
  os: string; // e.g. "windows"
  arch?: string; // e.g. "amd64"
  last_seen_at?: string; // ISO
  online?: boolean;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function titleCase(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prettyOs(osRaw: string) {
  const v = String(osRaw || "").toLowerCase();
  if (v === "windows") return "Windows";
  if (v === "linux") return "Linux";
  if (v === "darwin" || v === "mac" || v === "macos") return "macOS";
  return titleCase(osRaw);
}

function formatLastSeen(iso?: string) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;

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

function statusFrom(api: ApiDevice): DeviceRow["status"] {
  if (api.online) return "online";

  // If we saw it recently but it's offline, show "warning" (helps spot flapping agents)
  const t = api.last_seen_at ? Date.parse(api.last_seen_at) : NaN;
  if (Number.isFinite(t)) {
    const minutes = (Date.now() - t) / 60000;
    if (minutes <= 15) return "warning";
  }
  return "offline";
}

function mapApiToRow(api: ApiDevice): DeviceRow {
  const osPretty = prettyOs(api.os);
  const tags = [
    osPretty,
    api.arch ? api.arch.toUpperCase() : null,
  ].filter(Boolean) as string[];

  return {
    id: api.device_id,
    name: api.hostname || api.device_id,
    os: osPretty,
    status: statusFrom(api),
    lastSeen: formatLastSeen(api.last_seen_at),
    tags,
  };
}

export default function DevicesClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [os, setOs] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [downloadsOpen, setDownloadsOpen] = useState(false);

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load live devices (proxy route -> rmm.hi5tech.co.uk/api/devices)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/control/devices", {
          headers: {
            // TEMP until real auth is wired
            "X-Tenant-ID": "tnt_demo",
          },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const data = (await res.json()) as unknown;
        const list = Array.isArray(data) ? (data as ApiDevice[]) : ((data as any)?.devices ?? []);
        const mapped = (list as ApiDevice[]).map(mapApiToRow);

        if (!cancelled) {
          setDevices(mapped);
          if (!selectedId && mapped[0]?.id) setSelectedId(mapped[0].id);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load devices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => uniq(devices.flatMap((d) => d.tags)).sort((a, b) => a.localeCompare(b)), [devices]);
  const allOS = useMemo(() => uniq(devices.map((d) => d.os)).sort((a, b) => a.localeCompare(b)), [devices]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return devices.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (os !== "all" && d.os !== os) return false;
      if (tag !== "all" && !d.tags.includes(tag)) return false;

      if (!term) return true;

      const hay = [d.name, d.os, d.user ?? "", d.ip ?? "", d.lastSeen, d.tags.join(" ")].join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [devices, filter, os, tag, q]);

  const selected: DeviceRow | null = useMemo(() => {
    return devices.find((d) => d.id === selectedId) ?? null;
  }, [devices, selectedId]);

  // If filter/search removes selected device, pick first visible.
  useMemo(() => {
    if (!selectedId) return;
    const stillVisible = filtered.some((d) => d.id === selectedId);
    if (!stillVisible) setSelectedId(filtered[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <EnrollmentPackagesModal open={downloadsOpen} onClose={() => setDownloadsOpen(false)} />

      <div className="flex items-center justify-between gap-3">
        <StatCards devices={devices} activeFilter={filter} onFilter={setFilter} />
        <div className="hidden md:flex gap-2">
          <button className="hi5-btn-ghost text-sm" type="button" onClick={() => setDownloadsOpen(true)}>
            Agent downloads
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="hi5-panel p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1">
            <div className="text-xs opacity-70 mb-1">Search</div>
            <input
              className="hi5-input"
              placeholder="Search devices, users, tags, IP..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:w-[520px]">
            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">OS</div>
              <select className="hi5-input" value={os} onChange={(e) => setOs(e.target.value)}>
                <option value="all">All</option>
                {allOS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Tag</div>
              <select className="hi5-input" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="all">All</option>
                {allTags.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>

            <div className="hidden sm:block">
              <div className="text-xs opacity-70 mb-1">Quick</div>
              <div className="flex gap-2">
                <button type="button" className="hi5-btn-ghost text-sm flex-1" title="Demo">
                  Export
                </button>
                <button type="button" className="hi5-btn-primary text-sm flex-1" title="Demo">
                  Add device
                </button>
              </div>
            </div>
          </div>
        </div>

        {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
        {loading ? <div className="mt-2 text-xs opacity-70">Loading devices…</div> : null}

        <div className="mt-3 text-xs opacity-70">
          Showing <span className="font-semibold">{filtered.length}</span> of{" "}
          <span className="font-semibold">{devices.length}</span> devices.
        </div>

        <div className="mt-3 md:hidden">
          <button className="hi5-btn-ghost text-sm w-full" type="button" onClick={() => setDownloadsOpen(true)}>
            Agent downloads
          </button>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_.75fr] gap-4">
        <DeviceTable devices={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="hidden lg:block">
          <DeviceDetailsPanel device={selected} />
        </div>
        <div className="lg:hidden">
          <DeviceDetailsPanel device={selected} compact />
        </div>
      </div>
    </div>
  );
}
