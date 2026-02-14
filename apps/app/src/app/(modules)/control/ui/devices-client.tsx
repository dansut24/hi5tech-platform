// apps/app/src/app/(modules)/control/devices/ui/devices-client.tsx
"use client";

import { useMemo, useState } from "react";

import StatCards from "./stat-cards";
import DeviceTable from "./device-table";
import DeviceDetailsPanel from "./device-details-panel";
import { demoDevices, type DeviceRow } from "./device-data";
import EnrollmentPackagesModal from "./enrollment-packages-modal";

type Filter = "all" | "online" | "offline" | "warning";

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function DevicesClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [os, setOs] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(demoDevices[0]?.id ?? null);

  const [downloadsOpen, setDownloadsOpen] = useState(false);

  const allTags = useMemo(() => uniq(demoDevices.flatMap((d) => d.tags)).sort((a, b) => a.localeCompare(b)), []);
  const allOS = useMemo(() => uniq(demoDevices.map((d) => d.os)).sort((a, b) => a.localeCompare(b)), []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return demoDevices.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (os !== "all" && d.os !== os) return false;
      if (tag !== "all" && !d.tags.includes(tag)) return false;
      if (!term) return true;
      const hay = [d.name, d.os, d.user ?? "", d.ip ?? "", d.lastSeen, d.tags.join(" ")].join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [filter, os, tag, q]);

  const selected: DeviceRow | null = useMemo(() => demoDevices.find((d) => d.id === selectedId) ?? null, [selectedId]);

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
        <StatCards devices={demoDevices} activeFilter={filter} onFilter={setFilter} />
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
            <input className="hi5-input" placeholder="Search devices, users, tags, IP..." value={q} onChange={(e) => setQ(e.target.value)} />
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
                <button type="button" className="hi5-btn-ghost text-sm flex-1" title="Demo">Export</button>
                <button type="button" className="hi5-btn-primary text-sm flex-1" title="Demo">Add device</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs opacity-70">
          Showing <span className="font-semibold">{filtered.length}</span> of <span className="font-semibold">{demoDevices.length}</span> devices.
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
        <div className="hidden lg:block"><DeviceDetailsPanel device={selected} /></div>
        <div className="lg:hidden"><DeviceDetailsPanel device={selected} compact /></div>
      </div>
    </div>
  );
}
