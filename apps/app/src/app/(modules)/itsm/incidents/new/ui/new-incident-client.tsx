"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Tenant = { id: string; name: string; subdomain?: string; domain?: string };

const CATEGORIES = [
  "Access / Permissions",
  "Email",
  "Network",
  "Hardware",
  "Software",
  "Security",
  "Other",
];

const PRIORITIES: Array<"Low" | "Medium" | "High" | "Critical"> = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

export default function NewIncidentClient({ tenants }: { tenants: Tenant[] }) {
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [assetTag, setAssetTag] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tenantLabel = useMemo(() => {
    const t = tenants.find((x) => x.id === tenantId);
    if (!t) return "Tenant";
    const host = t.subdomain && t.domain ? `${t.subdomain}.${t.domain}` : "";
    return host ? `${t.name} (${host})` : t.name;
  }, [tenantId, tenants]);

  async function submit() {
    setErr(null);

    if (!tenantId) return setErr("Please select a tenant");
    if (!title.trim()) return setErr("Title is required");
    if (!description.trim()) return setErr("Description is required");

    setSaving(true);
    try {
      const res = await fetch("/api/itsm/incidents/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          title,
          description,
          category,
          priority,
          asset_tag: assetTag.trim() || null,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Create failed (${res.status})`);
      }

      const json = await res.json();
      const num = json?.incident?.number;
      const id = json?.incident?.id;

      // Route to incident detail by number (your existing link style)
      if (num) window.location.href = `/itsm/incidents/${encodeURIComponent(String(num))}`;
      else if (id) window.location.href = `/itsm/incidents/${encodeURIComponent(String(id))}`;
      else window.location.href = "/itsm/incidents";
    } catch (e: any) {
      setErr(e?.message || "Failed to create incident");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hi5-panel p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Create incident</div>
        <Link href="/itsm/incidents" className="hi5-btn-ghost text-sm w-auto">
          Back
        </Link>
      </div>

      {err ? <div className="text-sm text-red-500">{err}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <div className="text-xs opacity-70 mb-1">Tenant</div>
          <select
            className="w-full rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            disabled={saving}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.subdomain && t.domain ? `${t.name} — ${t.subdomain}.${t.domain}` : t.name}
              </option>
            ))}
          </select>
          <div className="text-[11px] opacity-60 mt-1">
            Submitting to: <span className="font-medium">{tenantLabel}</span>
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="text-xs opacity-70 mb-1">Category</div>
            <select
              className="w-full rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={saving}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-xs opacity-70 mb-1">Priority</div>
            <select
              className="w-full rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              disabled={saving}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <div className="text-[11px] opacity-60 mt-1">
              Matches SLA rules later (we’ll wire this next).
            </div>
          </label>
        </div>

        <label className="block lg:col-span-2">
          <div className="text-xs opacity-70 mb-1">Title</div>
          <input
            className="w-full rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Outlook won’t open on laptop"
            disabled={saving}
          />
        </label>

        <label className="block lg:col-span-2">
          <div className="text-xs opacity-70 mb-1">Description</div>
          <textarea
            className="w-full min-h-[140px] rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? When did it start? Any error messages?"
            disabled={saving}
          />
        </label>

        <label className="block lg:col-span-2">
          <div className="text-xs opacity-70 mb-1">Asset tag (optional)</div>
          <input
            className="w-full rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
            value={assetTag}
            onChange={(e) => setAssetTag(e.target.value)}
            placeholder="e.g. LT-1020"
            disabled={saving}
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="hi5-btn-ghost text-sm w-auto" disabled={saving} onClick={() => window.location.href = "/itsm/incidents"}>
          Cancel
        </button>
        <button className="hi5-btn-primary text-sm w-auto" disabled={saving} onClick={submit}>
          {saving ? "Creating…" : "Create incident"}
        </button>
      </div>
    </div>
  );
}
