"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Link2, RefreshCw, Unlink } from "lucide-react";

type ControlDevice = {
  device_id: string;
  hostname?: string | null;
  os?: string | null;
  arch?: string | null;
  agent_version?: string | null;
  online?: boolean | null;
  last_seen_at?: string | null;
  group_id?: string | null;
  asset_id?: string | null;
};

type Props = {
  assetId: string;
};

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value: any) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ControlLinkPanel({ assetId }: Props) {
  const [linkedDevice, setLinkedDevice] = useState<ControlDevice | null>(null);
  const [devices, setDevices] = useState<ControlDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableDevices = useMemo(() => {
    return devices.filter((device) => !device.asset_id || device.asset_id === assetId);
  }, [assetId, devices]);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/itsm/assets/link-control-device?asset_id=${encodeURIComponent(assetId)}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load Control device link (${res.status})`);
      }

      setLinkedDevice(json?.linkedDevice ?? null);
      setDevices(json?.devices ?? []);

      if (!selectedDeviceId && json?.devices?.[0]?.device_id) {
        setSelectedDeviceId(json.devices[0].device_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Control device link");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  async function linkDevice() {
    if (!selectedDeviceId) return;

    setWorking(true);
    setError(null);

    try {
      const res = await fetch("/api/itsm/assets/link-control-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: assetId,
          device_id: selectedDeviceId,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to link Control device (${res.status})`);
      }

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link Control device");
    } finally {
      setWorking(false);
    }
  }

  async function unlinkDevice() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch("/api/itsm/assets/link-control-device", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: assetId,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to unlink Control device (${res.status})`);
      }

      setLinkedDevice(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink Control device");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="hi5-card p-4 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
        <div>
          <div className="text-sm font-bold">Control device link</div>
          <div className="text-xs opacity-70 mt-1">
            Link this ITSM asset to a live Control device to enable remote actions and live status.
          </div>
        </div>

        <button type="button" className="hi5-btn-ghost text-xs inline-flex items-center gap-1" onClick={refresh} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 text-sm opacity-70">
          Loading Control link…
        </div>
      ) : linkedDevice ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 size={16} />
                {text(linkedDevice.hostname, linkedDevice.device_id)}
              </div>

              <div className="text-xs opacity-75 mt-1 leading-relaxed">
                {text(linkedDevice.os)} · {linkedDevice.online ? "Online" : "Offline"} · Last seen{" "}
                {formatDate(linkedDevice.last_seen_at)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/control/devices/${encodeURIComponent(linkedDevice.device_id)}?tab=overview`}
                className="hi5-btn-primary text-xs"
              >
                Open Control
              </Link>

              <Link
                href={`/control/devices/${encodeURIComponent(linkedDevice.device_id)}?tab=remote`}
                className="hi5-btn-ghost text-xs"
              >
                Remote
              </Link>

              <button type="button" className="hi5-btn-ghost text-xs inline-flex items-center gap-1" onClick={unlinkDevice} disabled={working}>
                <Unlink size={14} />
                Unlink
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold">No Control device linked</div>
            <div className="text-xs opacity-70 mt-1">
              Choose an enrolled Control device to link it to this ITSM asset.
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-2">
            <select
              className="hi5-input"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {availableDevices.length === 0 ? (
                <option value="">No available Control devices</option>
              ) : (
                availableDevices.map((device) => (
                  <option key={device.device_id} value={device.device_id}>
                    {device.hostname || device.device_id} {device.online ? "(online)" : "(offline)"}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              className="hi5-btn-primary text-sm inline-flex items-center gap-2"
              onClick={linkDevice}
              disabled={working || !selectedDeviceId}
            >
              <Link2 size={16} />
              Link device
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : null}
    </section>
  );
}
