"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clipboard,
  Database,
  FileSpreadsheet,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";

type Asset = {
  id: string;
  tenant_id: string;
  name: string;
  asset_type: string;
  status: string;
  source: string;
  external_id?: string | null;
  control_device_id?: string | null;
  serial_number?: string | null;
  asset_tag?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  hostname?: string | null;
  operating_system?: string | null;
  assigned_user_name?: string | null;
  assigned_user_email?: string | null;
  department?: string | null;
  location?: string | null;
  warranty_status?: string | null;
  warranty_expires_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

const EMPTY_FORM = {
  name: "",
  hostname: "",
  serial_number: "",
  asset_tag: "",
  manufacturer: "",
  model: "",
  operating_system: "",
  assigned_user_name: "",
  assigned_user_email: "",
  department: "",
  location: "",
  notes: "",
};

function StatusPill({ value }: { value: string }) {
  const tone =
    value === "active"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
      : value === "retired"
        ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25"
        : "bg-black/5 dark:bg-white/5 hi5-border";

  return (
    <span className={["inline-flex rounded-full border px-2 py-1 text-xs font-semibold", tone].join(" ")}>
      {value}
    </span>
  );
}

function SourcePill({ value }: { value: string }) {
  const label =
    value === "control" ? "Control" :
    value === "intune" ? "Intune" :
    value === "csv" ? "CSV" :
    value === "manual" ? "Manual" :
    value;

  return (
    <span className="inline-flex rounded-full border hi5-border bg-black/5 dark:bg-white/5 px-2 py-1 text-xs font-semibold">
      {label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="hi5-btn-ghost text-xs inline-flex items-center gap-1" onClick={copy}>
      {copied ? <Check size={14} /> : <Clipboard size={14} />}
      {copied ? "Copied" : "Copy ID"}
    </button>
  );
}

export default function AssetsClient() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [source, setSource] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [showCreate, setShowCreate] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = assets.length;
    const linked = assets.filter((asset) => asset.control_device_id).length;
    const manual = assets.filter((asset) => asset.source === "manual").length;
    const imported = assets.filter((asset) => asset.source !== "manual").length;

    return { total, linked, manual, imported };
  }, [assets]);

  async function loadAssets() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (source) params.set("source", source);

      const res = await fetch(`/api/itsm/assets?${params.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to load assets (${res.status})`);
      }

      setAssets(json?.assets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAsset() {
    if (!form.name.trim()) {
      setError("Asset name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/itsm/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          asset_type: "device",
          status: "active",
          source: "manual",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to create asset (${res.status})`);
      }

      setForm(EMPTY_FORM);
      setShowCreate(false);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="hi5-card p-4">
          <div className="text-xs opacity-70">Assets</div>
          <div className="text-2xl font-extrabold mt-1">{stats.total}</div>
        </div>

        <div className="hi5-card p-4">
          <div className="text-xs opacity-70">Linked to Control</div>
          <div className="text-2xl font-extrabold mt-1">{stats.linked}</div>
        </div>

        <div className="hi5-card p-4">
          <div className="text-xs opacity-70">Manual</div>
          <div className="text-2xl font-extrabold mt-1">{stats.manual}</div>
        </div>

        <div className="hi5-card p-4">
          <div className="text-xs opacity-70">Imported</div>
          <div className="text-2xl font-extrabold mt-1">{stats.imported}</div>
        </div>
      </section>

      <section className="hi5-panel p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div>
            <div className="text-lg font-bold">Asset register</div>
            <p className="text-sm opacity-70 mt-1">
              ITSM assets are independent from the Control agent, but can be linked to live devices.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="hi5-btn-primary text-sm inline-flex items-center gap-2"
              onClick={() => setShowCreate((v) => !v)}
            >
              <Plus size={16} />
              Add asset
            </button>

            <button
              type="button"
              className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
              disabled
              title="Coming soon"
            >
              <Upload size={16} />
              CSV import
            </button>

            <button
              type="button"
              className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
              disabled
              title="Coming soon"
            >
              <Database size={16} />
              Intune import
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_160px_auto] gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              className="hi5-input pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, hostname, serial, user, asset tag..."
            />
          </div>

          <select className="hi5-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
            <option value="lost">Lost</option>
            <option value="all">All status</option>
          </select>

          <select className="hi5-input" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            <option value="manual">Manual</option>
            <option value="csv">CSV</option>
            <option value="intune">Intune</option>
            <option value="control">Control</option>
          </select>

          <button type="button" className="hi5-btn-ghost text-sm inline-flex items-center gap-2" onClick={loadAssets}>
            <RefreshCw size={16} />
            Filter
          </button>
        </div>

        {showCreate ? (
          <div className="rounded-3xl border hi5-border bg-black/5 dark:bg-white/5 p-4 space-y-4">
            <div>
              <div className="text-sm font-bold">Create manual asset</div>
              <div className="text-xs opacity-70 mt-1">
                CSV and Intune imports will use this same asset model later.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[
                ["name", "Asset name *"],
                ["hostname", "Hostname"],
                ["serial_number", "Serial number"],
                ["asset_tag", "Asset tag"],
                ["manufacturer", "Manufacturer"],
                ["model", "Model"],
                ["operating_system", "Operating system"],
                ["assigned_user_name", "Assigned user"],
                ["assigned_user_email", "Assigned email"],
                ["department", "Department"],
                ["location", "Location"],
              ].map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <div className="text-xs opacity-70 mb-1">{label}</div>
                  <input
                    className="hi5-input"
                    value={(form as any)[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </label>
              ))}

              <label className="block text-sm md:col-span-2 xl:col-span-3">
                <div className="text-xs opacity-70 mb-1">Notes</div>
                <textarea
                  className="hi5-input min-h-[92px]"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="hi5-btn-primary text-sm" onClick={createAsset} disabled={creating}>
                {creating ? "Creating..." : "Create asset"}
              </button>

              <button type="button" className="hi5-btn-ghost text-sm" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="overflow-auto rounded-2xl border hi5-border">
          <table className="w-full text-sm">
            <thead className="text-left text-xs opacity-70 border-b hi5-border">
              <tr>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Assigned user</th>
                <th className="px-3 py-2">Serial / tag</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Control</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center opacity-70">
                    Loading assets...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center opacity-70">
                    No assets found. Add one manually or import via CSV/Intune later.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="border-b hi5-border last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{asset.name}</div>
                      <div className="text-xs opacity-65">
                        {asset.hostname || "No hostname"} · {asset.manufacturer || "Unknown"} {asset.model || ""}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div>{asset.assigned_user_name || "—"}</div>
                      <div className="text-xs opacity-65">{asset.assigned_user_email || ""}</div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-mono text-xs">{asset.serial_number || "—"}</div>
                      <div className="text-xs opacity-65">{asset.asset_tag || ""}</div>
                    </td>

                    <td className="px-3 py-3">
                      <SourcePill value={asset.source} />
                    </td>

                    <td className="px-3 py-3">
                      {asset.control_device_id ? (
                        <Link
                          href={`/control/devices/${encodeURIComponent(asset.control_device_id)}?tab=overview`}
                          className="hi5-btn-ghost text-xs inline-flex items-center gap-1"
                        >
                          <Monitor size={14} />
                          Open Control
                        </Link>
                      ) : (
                        <span className="text-xs opacity-60">Not linked</span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <StatusPill value={asset.status} />
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <CopyButton value={asset.id} />
                        <Link href={`/itsm/assets/${asset.id}`} className="hi5-btn-ghost text-xs">
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="hi5-card p-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <FileSpreadsheet size={17} />
            CSV import
          </div>
          <p className="text-sm opacity-70 mt-2">
            Next pass: upload CSV, map columns, preview changes, then import/update assets.
          </p>
        </div>

        <div className="hi5-card p-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Database size={17} />
            Intune import
          </div>
          <p className="text-sm opacity-70 mt-2">
            Later: pull managed devices from Microsoft Graph into this same asset register.
          </p>
        </div>

        <div className="hi5-card p-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Monitor size={17} />
            Control link
          </div>
          <p className="text-sm opacity-70 mt-2">
            Control devices can be linked to assets, allowing tickets to launch remote actions where enabled.
          </p>
        </div>
      </section>
    </div>
  );
}
