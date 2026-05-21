"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageSearch, RefreshCw, Save, Search, ShieldAlert } from "lucide-react";

type CatalogItem = {
  package_id: string;
  name: string;
  publisher?: string;
  manager?: string;
  source?: string;
  latest_version?: string;
  criticality?: string;
  default_policy_action?: string;
  policy_action?: string;
  criticality_override?: string;
  effective_criticality?: string;
  effective_action?: string;
  security_update?: boolean;
  cve_score?: number | null;
  cve_severity?: string;
  cve_count?: number;
  notes?: string;
  rule_notes?: string;
  last_seen_device_id?: string;
  last_seen_at?: string;
};

type EditState = {
  package_id: string;
  policy_action: string;
  criticality_override: string;
  notes: string;
  cve_score: string;
  cve_severity: string;
  cve_count: string;
  security_update: boolean;
};

const ACTIONS = [
  { value: "auto_update", label: "Auto update" },
  { value: "approve_only", label: "Approve only" },
  { value: "skip", label: "Skip" },
  { value: "block", label: "Block" },
];

const CRITICALITIES = [
  { value: "", label: "Use default" },
  { value: "critical", label: "Critical" },
  { value: "important", label: "Important" },
  { value: "normal", label: "Normal" },
  { value: "optional", label: "Optional" },
];

function badgeClass(value?: string) {
  switch ((value || "").toLowerCase()) {
    case "critical":
      return "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300";
    case "important":
      return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
    case "auto_update":
    case "install":
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "block":
    case "skip":
      return "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";
    default:
      return "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300";
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

export default function SoftwareCatalogueClient() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      qs.set("limit", "300");
      const res = await fetch(`/api/control/software/catalogue?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to load software catalogue");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load software catalogue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => {
    const critical = items.filter((i) => i.effective_criticality === "critical").length;
    const auto = items.filter((i) => i.effective_action === "auto_update").length;
    const blocked = items.filter((i) => i.effective_action === "block" || i.effective_action === "skip").length;
    return { critical, auto, blocked, total: items.length };
  }, [items]);

  function startEdit(item: CatalogItem) {
    setEdit({
      package_id: item.package_id,
      policy_action: item.effective_action || item.policy_action || item.default_policy_action || "approve_only",
      criticality_override: item.criticality_override || "",
      notes: item.rule_notes || "",
      cve_score: item.cve_score == null ? "" : String(item.cve_score),
      cve_severity: item.cve_severity || "",
      cve_count: item.cve_count ? String(item.cve_count) : "",
      security_update: item.security_update === true,
    });
  }

  async function saveRule() {
    if (!edit) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        package_id: edit.package_id,
        policy_action: edit.policy_action,
        criticality_override: edit.criticality_override,
        notes: edit.notes,
        cve_score: edit.cve_score.trim() ? Number(edit.cve_score) : null,
        cve_severity: edit.cve_severity,
        cve_count: edit.cve_count.trim() ? Number(edit.cve_count) : 0,
        security_update: edit.security_update,
      };
      const res = await fetch("/api/control/software/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to save rule");
      setEdit(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border hi5-border px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <PackageSearch size={14} /> Third-party software catalogue
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Software catalogue</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
            Build a searchable package catalogue from WinGet scan results, then choose what should auto-update, require approval, be skipped, or be blocked.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border hi5-border px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Packages", summary.total],
          ["Critical", summary.critical],
          ["Auto update", summary.auto],
          ["Skipped/blocked", summary.blocked],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border hi5-border bg-white/80 p-4 shadow-sm dark:bg-neutral-950/70">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border hi5-border bg-white/80 p-4 shadow-sm dark:bg-neutral-950/70">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} placeholder="Search by package ID, name or publisher" className="w-full rounded-xl border hi5-border bg-white py-2 pl-9 pr-3 text-sm dark:bg-neutral-900" />
          </div>
          <button type="button" onClick={() => void load()} className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">Search</button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border hi5-border bg-white/80 shadow-sm dark:bg-neutral-950/70">
        <div className="border-b hi5-border p-4">
          <h2 className="font-semibold">Known update packages</h2>
          <p className="mt-1 text-sm text-neutral-500">This list is populated when devices run the third-party software update scan.</p>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-neutral-500">Loading catalogue...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-neutral-500">No packages yet. Run a third-party software scan from a device Jobs tab first.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900/70">
                <tr>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Latest</th>
                  <th className="px-4 py-3">Criticality</th>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">CVE</th>
                  <th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y hi5-border">
                {items.map((item) => (
                  <tr key={item.package_id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name || item.package_id}</div>
                      <div className="mt-1 font-mono text-xs text-neutral-500">{item.package_id}</div>
                      <div className="mt-1 text-xs text-neutral-500">{item.manager || "winget"} · {item.source || "winget"}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item.latest_version || "—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs ${badgeClass(item.effective_criticality)}`}>{item.effective_criticality || item.criticality || "normal"}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs ${badgeClass(item.effective_action)}`}>{item.effective_action || "approve_only"}</span></td>
                    <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                      {item.cve_score ? <div className="inline-flex items-center gap-1"><ShieldAlert size={14} /> CVSS {item.cve_score}</div> : "—"}
                      {item.cve_count ? <div>{item.cve_count} CVE(s)</div> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">{formatDate(item.last_seen_at)}</td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => startEdit(item)} className="rounded-lg border hi5-border px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border hi5-border bg-white p-5 shadow-2xl dark:bg-neutral-950">
            <h3 className="text-lg font-semibold">Catalogue rule</h3>
            <p className="mt-1 break-all font-mono text-xs text-neutral-500">{edit.package_id}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium">Policy action
                <select value={edit.policy_action} onChange={(e) => setEdit((x) => x && ({ ...x, policy_action: e.target.value }))} className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900">
                  {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Criticality override
                <select value={edit.criticality_override} onChange={(e) => setEdit((x) => x && ({ ...x, criticality_override: e.target.value }))} className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900">
                  {CRITICALITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">CVSS score
                <input value={edit.cve_score} onChange={(e) => setEdit((x) => x && ({ ...x, cve_score: e.target.value }))} placeholder="9.8" className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900" />
              </label>
              <label className="block text-sm font-medium">CVE severity
                <input value={edit.cve_severity} onChange={(e) => setEdit((x) => x && ({ ...x, cve_severity: e.target.value }))} placeholder="CRITICAL" className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900" />
              </label>
              <label className="block text-sm font-medium">CVE count
                <input value={edit.cve_count} onChange={(e) => setEdit((x) => x && ({ ...x, cve_count: e.target.value }))} placeholder="1" className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900" />
              </label>
              <label className="mt-7 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edit.security_update} onChange={(e) => setEdit((x) => x && ({ ...x, security_update: e.target.checked }))} /> Security update
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium">Notes
              <textarea value={edit.notes} onChange={(e) => setEdit((x) => x && ({ ...x, notes: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEdit(null)} className="rounded-xl border hi5-border px-4 py-2 text-sm font-medium">Cancel</button>
              <button type="button" onClick={() => void saveRule()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-neutral-950"><Save size={16} /> Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
