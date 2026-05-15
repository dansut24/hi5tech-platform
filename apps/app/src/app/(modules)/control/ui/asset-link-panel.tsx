"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Link2, Plus, RefreshCw, Unlink } from "lucide-react";

type Asset = {
  id: string;
  name: string;
  hostname?: string | null;
  serial_number?: string | null;
  asset_tag?: string | null;
  assigned_user_name?: string | null;
  assigned_user_email?: string | null;
  source?: string | null;
  status?: string | null;
  control_device_id?: string | null;
};

type Props = {
  deviceId: string;
};

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function AssetLinkPanel({ deviceId }: Props) {
  const [linkedAsset, setLinkedAsset] = useState<Asset | null>(null);
  const [candidates, setCandidates] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableCandidates = useMemo(() => {
    return candidates.filter((asset) => !asset.control_device_id || asset.control_device_id === deviceId);
  }, [candidates, deviceId]);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/control/devices/${encodeURIComponent(deviceId)}/asset`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load asset link (${res.status})`);
      }

      setLinkedAsset(json?.linkedAsset ?? null);
      setCandidates(json?.candidates ?? []);

      if (!selectedAssetId && json?.candidates?.[0]?.id) {
        setSelectedAssetId(json.candidates[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load asset link");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  async function createAssetFromDevice() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch(`/api/control/devices/${encodeURIComponent(deviceId)}/asset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_from_device" }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to create asset (${res.status})`);
      }

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset from device");
    } finally {
      setWorking(false);
    }
  }

  async function linkExistingAsset() {
    if (!selectedAssetId) return;

    setWorking(true);
    setError(null);

    try {
      const res = await fetch(`/api/control/devices/${encodeURIComponent(deviceId)}/asset`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: selectedAssetId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to link asset (${res.status})`);
      }

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link asset");
    } finally {
      setWorking(false);
    }
  }

  async function unlinkAsset() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch(`/api/control/devices/${encodeURIComponent(deviceId)}/asset`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to unlink asset (${res.status})`);
      }

      setLinkedAsset(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlink asset");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="hi5-card p-4 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
        <div>
          <div className="text-sm font-bold">ITSM asset link</div>
          <div className="text-xs opacity-70 mt-1">
            Connect this live Control device to an ITSM asset record for tickets, ownership and asset history.
          </div>
        </div>

        <button type="button" className="hi5-btn-ghost text-xs inline-flex items-center gap-1" onClick={refresh} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 text-sm opacity-70">
          Loading asset link…
        </div>
      ) : linkedAsset ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 size={16} />
                {linkedAsset.name}
              </div>

              <div className="text-xs opacity-75 mt-1 leading-relaxed">
                Hostname {text(linkedAsset.hostname)} · Serial {text(linkedAsset.serial_number)} · User{" "}
                {text(linkedAsset.assigned_user_name || linkedAsset.assigned_user_email)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/itsm/assets/${linkedAsset.id}`} className="hi5-btn-primary text-xs">
                Open asset
              </Link>

              <button type="button" className="hi5-btn-ghost text-xs inline-flex items-center gap-1" onClick={unlinkAsset} disabled={working}>
                <Unlink size={14} />
                Unlink
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold">No ITSM asset linked</div>
            <div className="text-xs opacity-70 mt-1">
              Create a new asset from this device inventory, or link this device to an existing ITSM asset.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="hi5-btn-primary text-sm inline-flex items-center gap-2"
              onClick={createAssetFromDevice}
              disabled={working}
            >
              <Plus size={16} />
              Create asset from device
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-2">
            <select
              className="hi5-input"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              {availableCandidates.length === 0 ? (
                <option value="">No available assets</option>
              ) : (
                availableCandidates.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} {asset.hostname ? `(${asset.hostname})` : ""}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
              onClick={linkExistingAsset}
              disabled={working || !selectedAssetId}
            >
              <Link2 size={16} />
              Link existing
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
