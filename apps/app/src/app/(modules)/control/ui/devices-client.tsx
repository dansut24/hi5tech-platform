// apps/app/src/app/(modules)/control/ui/devices-client.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import StatCards from "./stat-cards";
import DeviceTable from "./device-table";
import DeviceDetailsPanel from "./device-details-panel";
import { toDeviceRow, type DeviceApiRow, type DeviceRow } from "./device-data";

type Filter = "all" | "online" | "offline" | "warning";

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function DevicesClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [os, setOs] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const applyDevices = useCallback((arr: DeviceApiRow[]) => {
    const mapped = arr.map(toDeviceRow);
    setDevices(mapped);
    setSelectedId((prev) => {
      if (prev && mapped.some((d) => d.id === prev)) return prev;
      return mapped[0]?.id ?? null;
    });
  }, []);

  const reloadDevices = useCallback(async () => {
    const res = await fetch("/api/control/devices", { cache: "no-store" });

    if (res.status === 401) {
      throw new Error("Session expired — please refresh the page.");
    }

    if (!res.ok) {
      throw new Error(`Devices API responded with HTTP ${res.status}`);
    }

    const arr = (await res.json()) as DeviceApiRow[];
    applyDevices(arr);
  }, [applyDevices]);

  // Poll through our own authenticated Next.js API route — never hit the RMM
  // server directly from the browser. The API route validates the session and
  // forwards the request with a verified tenant ID.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/control/devices", { cache: "no-store" });

        if (res.status === 401) {
          if (!cancelled) {
            setError("Session expired — please refresh the page.");
            setLoading(false);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`Devices API responded with HTTP ${res.status}`);
        }

        const arr = (await res.json()) as DeviceApiRow[];

        if (!cancelled) {
          applyDevices(arr);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load devices");
          setLoading(false);
        }
      }
    }

    load();
    const t = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [applyDevices]);

  const deleteDevice = useCallback(async (device: DeviceRow) => {
    const ok = window.confirm(
      `Delete ${device.name}?\n\nThis removes the device from Control. If the agent is still installed and able to enrol again, it may reappear.`
    );
    if (!ok) return;

    setDeletingId(device.id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/control/devices/${encodeURIComponent(device.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as any)?.error || `Delete failed with HTTP ${res.status}`);
      }

      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      setSelectedId((prev) => (prev === device.id ? null : prev));
      await reloadDevices().catch(() => undefined);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete device");
    } finally {
      setDeletingId(null);
    }
  }, [reloadDevices]);

  const allTags = useMemo(
    () => uniq(devices.flatMap((d) => d.tags)).sort((a, b) => a.localeCompare(b)),
    [devices]
  );
  const allOS = useMemo(
    () => uniq(devices.map((d) => d.os)).sort((a, b) => a.localeCompare(b)),
    [devices]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return devices.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (os !== "all" && d.os !== os) return false;
      if (tag !== "all" && !d.tags.includes(tag)) return false;
      if (!term) return true;
      const hay = [d.name, d.os, d.user ?? "", d.ip ?? "", d.lastSeen, d.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [devices, filter, os, tag, q]);

  const selected: DeviceRow | null = useMemo(
    () => devices.find((d) => d.id === selectedId) ?? null,
    [devices, selectedId]
  );

  useMemo(() => {
    if (!selectedId) return;
    if (!filtered.some((d) => d.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatCards devices={devices} activeFilter={filter} onFilter={setFilter} />

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
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Tag</div>
              <select className="hi5-input" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="all">All</option>
                {allTags.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </label>

            <div className="hidden sm:block">
              <div className="text-xs opacity-70 mb-1">Quick</div>
              <div className="flex gap-2">
                <button type="button" className="hi5-btn-ghost text-sm flex-1" title="Soon">
                  Export
                </button>
                <button type="button" className="hi5-btn-primary text-sm flex-1" title="Soon">
                  Add device
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs opacity-70">
          {loading ? (
            "Loading devices…"
          ) : error ? (
            <span className="text-red-500">{error}</span>
          ) : (
            <>
              Showing <span className="font-semibold">{filtered.length}</span> of{" "}
              <span className="font-semibold">{devices.length}</span> devices.
            </>
          )}
        </div>

        {deleteError && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {deleteError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_.75fr] gap-4">
        <DeviceTable
          devices={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={deleteDevice}
          deletingId={deletingId}
        />
        <div className="hidden lg:block">
          <DeviceDetailsPanel
            device={selected}
            onDelete={deleteDevice}
            deleting={!!selected && deletingId === selected.id}
          />
        </div>
        <div className="lg:hidden">
          <DeviceDetailsPanel
            device={selected}
            compact
            onDelete={deleteDevice}
            deleting={!!selected && deletingId === selected.id}
          />
        </div>
      </div>
    </div>
  );
}
