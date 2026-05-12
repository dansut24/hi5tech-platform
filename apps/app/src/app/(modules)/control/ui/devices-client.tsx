// apps/app/src/app/(modules)/control/ui/devices-client.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import StatCards from "./stat-cards";
import DeviceTable from "./device-table";
import DeviceDetailsPanel from "./device-details-panel";
import { toDeviceRow, type DeviceApiRow, type DeviceRow } from "./device-data";

type Filter = "all" | "online" | "offline" | "warning";

type DeviceGroup = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at?: string;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function groupFilterLabel(groups: DeviceGroup[], groupId: string) {
  if (groupId === "all") return "All groups";
  if (groupId === "default") return "Default";
  return groups.find((g) => g.id === groupId)?.name ?? "Unknown group";
}

export default function DevicesClient() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [os, setOs] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [movingDevice, setMovingDevice] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string>("default");

  const applyDevices = useCallback((arr: DeviceApiRow[]) => {
    const mapped = arr.map(toDeviceRow);
    setDevices(mapped);
    setSelectedId((prev) => {
      if (prev && mapped.some((d) => d.id === prev)) return prev;
      return mapped[0]?.id ?? null;
    });
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupError(null);
    try {
      const res = await fetch("/api/control/device-groups", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Groups API responded with HTTP ${res.status}`);
      setGroups(Array.isArray(json?.groups) ? json.groups : []);
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setGroupsLoading(false);
    }
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
    loadGroups();
    const t = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [applyDevices, loadGroups]);

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
      if (groupFilter === "default" && d.groupId) return false;
      if (groupFilter !== "all" && groupFilter !== "default" && d.groupId !== groupFilter) return false;
      if (!term) return true;
      const hay = [
        d.name,
        d.os,
        d.arch ?? "",
        d.user ?? "",
        d.ip ?? "",
        d.lastSeen,
        d.groupName,
        d.agentVersion ?? "",
        d.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [devices, filter, os, tag, q, groupFilter]);

  const displayGroups = useMemo(
    () => groups.filter((g) => g.slug !== "default"),
    [groups]
  );

  const selected: DeviceRow | null = useMemo(
    () => devices.find((d) => d.id === selectedId) ?? null,
    [devices, selectedId]
  );

  useEffect(() => {
    if (!selectedId) return;
    if (!filtered.some((d) => d.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    setTargetGroupId(selected?.groupId ?? "default");
  }, [selected?.id, selected?.groupId]);

  async function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;

    setCreatingGroup(true);
    setGroupError(null);
    try {
      const res = await fetch("/api/control/device-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to create group (${res.status})`);
      setNewGroupName("");
      await loadGroups();
      if (json?.group?.id) {
        setGroupFilter(json.group.id);
        setTargetGroupId(json.group.id);
      }
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function moveSelectedDevice() {
    if (!selected) return;
    setMovingDevice(true);
    setGroupError(null);
    try {
      const groupId = targetGroupId === "default" ? null : targetGroupId;
      const res = await fetch(`/api/control/devices/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to move device (${res.status})`);

      const nextGroup = groupId ? groups.find((g) => g.id === groupId) : null;
      setDevices((prev) =>
        prev.map((d) =>
          d.id === selected.id
            ? { ...d, groupId, groupName: nextGroup?.name ?? "Default" }
            : d
        )
      );
      await reloadDevices().catch(() => undefined);
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "Failed to move device");
    } finally {
      setMovingDevice(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatCards devices={devices} activeFilter={filter} onFilter={setFilter} />

      <div className="hi5-panel p-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-3">
          <div className="flex-1">
            <div className="text-xs opacity-70 mb-1">Search</div>
            <input
              className="hi5-input"
              placeholder="Search devices, users, groups, tags, IP..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xl:w-[780px]">
            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Group</div>
              <select className="hi5-input" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
                <option value="all">All groups</option>
                <option value="default">Default</option>
                {displayGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>

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

            <div>
              <div className="text-xs opacity-70 mb-1">Add device</div>
              <Link className="hi5-btn-primary text-sm w-full text-center block" href={`/control/downloads${groupFilter !== "all" ? `?group_id=${encodeURIComponent(groupFilter)}` : ""}`}>
                Agent install
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs opacity-70">
          <div>
            {loading ? (
              "Loading devices…"
            ) : error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              <>
                Showing <span className="font-semibold">{filtered.length}</span> of{" "}
                <span className="font-semibold">{devices.length}</span> devices in{" "}
                <span className="font-semibold">{groupFilterLabel(groups, groupFilter)}</span>.
              </>
            )}
          </div>

          <button
            type="button"
            className="hi5-btn-ghost text-xs"
            onClick={() => {
              setLoading(true);
              Promise.all([reloadDevices(), loadGroups()]).finally(() => setLoading(false));
            }}
          >
            Refresh
          </button>
        </div>

        {deleteError && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
            {deleteError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="hi5-panel p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Device groups</div>
              <div className="text-xs opacity-70 mt-1">
                Create groups, filter inventory, and move selected devices between groups.
              </div>
            </div>
            <Link className="hi5-btn-ghost text-xs" href="/control/downloads">
              Open downloads
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <input
              className="hi5-input"
              placeholder="New group name, e.g. Servers, Sales, Laptops"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createGroup();
              }}
            />
            <button className="hi5-btn-primary text-sm" type="button" disabled={creatingGroup || !newGroupName.trim()} onClick={createGroup}>
              {creatingGroup ? "Creating…" : "Create group"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={["rounded-full border hi5-border px-3 py-1 text-xs", groupFilter === "all" ? "bg-[rgba(var(--hi5-accent),0.12)]" : ""].join(" ")}
              onClick={() => setGroupFilter("all")}
            >
              All ({devices.length})
            </button>
            <button
              type="button"
              className={["rounded-full border hi5-border px-3 py-1 text-xs", groupFilter === "default" ? "bg-[rgba(var(--hi5-accent),0.12)]" : ""].join(" ")}
              onClick={() => setGroupFilter("default")}
            >
              Default ({devices.filter((d) => !d.groupId).length})
            </button>
            {displayGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                className={["rounded-full border hi5-border px-3 py-1 text-xs", groupFilter === g.id ? "bg-[rgba(var(--hi5-accent),0.12)]" : ""].join(" ")}
                onClick={() => setGroupFilter(g.id)}
              >
                {g.name} ({devices.filter((d) => d.groupId === g.id).length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Move selected device</div>
              <select className="hi5-input" value={targetGroupId} disabled={!selected} onChange={(e) => setTargetGroupId(e.target.value)}>
                <option value="default">Default</option>
                {displayGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="hi5-btn-ghost text-sm"
              disabled={!selected || movingDevice || targetGroupId === (selected.groupId ?? "default")}
              onClick={moveSelectedDevice}
            >
              {movingDevice ? "Moving…" : selected ? `Move ${selected.name}` : "Select a device"}
            </button>
          </div>

          {groupsLoading && <div className="text-xs opacity-70">Loading groups…</div>}
          {groupError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {groupError}
            </div>
          )}
        </div>

        <div className="hi5-panel p-4">
          <div className="text-sm font-semibold">Selected device</div>
          <div className="text-xs opacity-70 mt-1">{selected ? selected.name : "No device selected"}</div>
          {selected && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="hi5-card p-3">
                <div className="text-xs opacity-70">Group</div>
                <div className="font-semibold mt-1">{selected.groupName}</div>
              </div>
              <div className="hi5-card p-3">
                <div className="text-xs opacity-70">Agent</div>
                <div className="font-semibold mt-1 truncate">{selected.agentVersion ?? "—"}</div>
              </div>
            </div>
          )}
        </div>
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
