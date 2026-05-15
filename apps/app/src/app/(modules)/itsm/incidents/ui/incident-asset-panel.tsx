"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clipboard,
  Link2,
  Monitor,
  RefreshCw,
  Search,
  Unlink,
} from "lucide-react";

type Asset = {
  id: string;
  name: string;
  hostname?: string | null;
  serial_number?: string | null;
  asset_tag?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  operating_system?: string | null;
  assigned_user_name?: string | null;
  assigned_user_email?: string | null;
  department?: string | null;
  location?: string | null;
  source?: string | null;
  status?: string | null;
  control_device_id?: string | null;
};

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

type FeatureState = {
  control_enabled?: boolean;
  remote_control?: boolean;
  remote_terminal?: boolean;
  remote_files?: boolean;
};

type Props = {
  incidentId: string;
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

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "bad" | "warning" | "neutral" | "info";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "bad"
        ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
        : tone === "warning"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"
          : tone === "info"
            ? "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200"
            : "hi5-border bg-black/5 dark:bg-white/5";

  return (
    <span className={["inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", cls].join(" ")}>
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-3">
      <div className="text-xs opacity-65">{label}</div>
      <div className="text-sm font-semibold mt-1 break-words">{text(value)}</div>
    </div>
  );
}

export default function IncidentAssetPanel({ incidentId }: Props) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [linkedDevice, setLinkedDevice] = useState<ControlDevice | null>(null);
  const [candidates, setCandidates] = useState<Asset[]>([]);
  const [features, setFeatures] = useState<FeatureState>({});
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCandidates = useMemo(() => {
    const needle = q.trim().toLowerCase();

    if (!needle) {
      return candidates;
    }

    return candidates.filter((item) => {
      const haystack = [
        item.name,
        item.hostname,
        item.serial_number,
        item.asset_tag,
        item.assigned_user_name,
        item.assigned_user_email,
        item.department,
        item.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [candidates, q]);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/itsm/incidents/${encodeURIComponent(incidentId)}/asset`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load affected asset (${res.status})`);
      }

      setAsset(json?.asset ?? null);
      setLinkedDevice(json?.linkedDevice ?? null);
      setCandidates(json?.candidates ?? []);
      setFeatures(json?.features ?? {});

      if (!selectedAssetId && json?.candidates?.[0]?.id) {
        setSelectedAssetId(json.candidates[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load affected asset");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  async function linkAsset() {
    if (!selectedAssetId) return;

    setWorking(true);
    setError(null);

    try {
      const res = await fetch(`/api/itsm/incidents/${encodeURIComponent(incidentId)}/asset`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: selectedAssetId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to link affected asset (${res.status})`);
      }

      setAsset(json?.asset ?? null);
      setLinkedDevice(json?.linkedDevice ?? null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link affected asset");
    } finally {
      setWorking(false);
    }
  }

  async function unlinkAsset() {
    setWorking(true);
    setError(null);

    try {
      const res = await fetch(`/api/itsm/incidents/${encodeURIComponent(incidentId)}/asset`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to remove affected asset (${res.status})`);
      }

      setAsset(null);
      setLinkedDevice(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove affected asset");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="hi5-card p-4 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
        <div>
          <div className="text-sm font-bold">Affected asset</div>
          <div className="text-xs opacity-70 mt-1">
            Link this incident to an asset. If the asset is linked to Control, technicians can open live device actions.
          </div>
        </div>

        <button
          type="button"
          className="hi5-btn-ghost text-xs inline-flex items-center gap-1"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 text-sm opacity-70">
          Loading affected asset…
        </div>
      ) : asset ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 size={16} />
                    {asset.name}
                  </span>

                  <Pill tone={asset.status === "active" ? "good" : "neutral"}>
                    {text(asset.status)}
                  </Pill>

                  <Pill>{text(asset.source)}</Pill>

                  {linkedDevice ? (
                    <Pill tone={linkedDevice.online ? "good" : "bad"}>
                      {linkedDevice.online ? "Control online" : "Control offline"}
                    </Pill>
                  ) : (
                    <Pill tone="warning">No Control link</Pill>
                  )}
                </div>

                <div className="text-xs opacity-75 mt-2 leading-relaxed">
                  {text(asset.hostname, "No hostname")} · Serial {text(asset.serial_number)} ·{" "}
                  {text(asset.manufacturer)} {text(asset.model, "")}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/itsm/assets/${asset.id}`} className="hi5-btn-primary text-xs">
                  Open asset
                </Link>

                {linkedDevice && features.control_enabled ? (
                  <Link
                    href={`/control/devices/${encodeURIComponent(linkedDevice.device_id)}?tab=overview`}
                    className="hi5-btn-ghost text-xs inline-flex items-center gap-1"
                  >
                    <Monitor size={14} />
                    Open Control
                  </Link>
                ) : null}

                {linkedDevice && features.remote_control ? (
                  <Link
                    href={`/control/devices/${encodeURIComponent(linkedDevice.device_id)}?tab=remote`}
                    className="hi5-btn-ghost text-xs"
                  >
                    Remote
                  </Link>
                ) : null}

                {linkedDevice && features.remote_control ? (
                  <Link
                    href={`/control/devices/${encodeURIComponent(linkedDevice.device_id)}?tab=remote&mode=backstage`}
                    className="hi5-btn-ghost text-xs"
                  >
                    Background
                  </Link>
                ) : null}

                <button
                  type="button"
                  className="hi5-btn-ghost text-xs inline-flex items-center gap-1"
                  onClick={unlinkAsset}
                  disabled={working}
                >
                  <Unlink size={14} />
                  Unlink
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Field label="Assigned user" value={asset.assigned_user_name || asset.assigned_user_email} />
            <Field label="Department" value={asset.department} />
            <Field label="Location" value={asset.location} />
            <Field label="Asset tag" value={asset.asset_tag} />
          </div>

          {linkedDevice ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Field label="Control device" value={linkedDevice.hostname || linkedDevice.device_id} />
              <Field label="Device status" value={linkedDevice.online ? "Online" : "Offline"} />
              <Field label="Last seen" value={formatDate(linkedDevice.last_seen_at)} />
              <Field label="Agent version" value={linkedDevice.agent_version} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold">No affected asset selected</div>
            <div className="text-xs opacity-70 mt-1">
              Search for an asset and link it to this incident.
            </div>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              className="hi5-input pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search asset, hostname, serial, user, department..."
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-2">
            <select
              className="hi5-input"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
            >
              {filteredCandidates.length === 0 ? (
                <option value="">No matching assets</option>
              ) : (
                filteredCandidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.hostname ? ` (${item.hostname})` : ""}
                    {item.assigned_user_name ? ` - ${item.assigned_user_name}` : ""}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              className="hi5-btn-primary text-sm inline-flex items-center gap-2"
              onClick={linkAsset}
              disabled={working || !selectedAssetId}
            >
              <Link2 size={16} />
              Link asset
            </button>
          </div>

          <div className="text-xs opacity-70 leading-relaxed">
            No asset yet? Create it from <Link href="/itsm/assets" className="underline">ITSM Assets</Link>, then return here and refresh.
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
