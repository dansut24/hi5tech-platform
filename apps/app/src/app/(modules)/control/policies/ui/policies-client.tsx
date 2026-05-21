"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, Play, RefreshCw, Save, ShieldCheck } from "lucide-react";

type Policy = {
  policy_id: string;
  name: string;
  policy_type: "inventory" | "windows_update" | "alert_remediation" | string;
  enabled: boolean;
  interval_minutes: number;
  target_scope: string;
  target_device_ids?: unknown;
  settings_json?: Record<string, unknown> | string | null;
  last_run_at?: string | null;
  next_run_at?: string | null;
  last_run_summary?: string | null;
  last_actions_json?: unknown;
  created_at?: string;
  updated_at?: string;
};

type FormState = {
  policy_id?: string;
  name: string;
  policy_type: "inventory" | "windows_update" | "alert_remediation";
  enabled: boolean;
  interval_minutes: number;
  target_scope: "all_online" | "selected";
  target_device_ids_text: string;
  update_mode: "scan" | "install_all" | "history";
  include_drivers: boolean;
};

const DEFAULT_FORM: FormState = {
  name: "Daily Windows Update scan",
  policy_type: "windows_update",
  enabled: true,
  interval_minutes: 720,
  target_scope: "all_online",
  target_device_ids_text: "",
  update_mode: "scan",
  include_drivers: false,
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function policyIcon(type: string) {
  if (type === "windows_update") return <ShieldCheck size={18} />;
  if (type === "alert_remediation") return <Activity size={18} />;
  return <RefreshCw size={18} />;
}

function policyTypeLabel(type: string) {
  if (type === "windows_update") return "Windows Update";
  if (type === "alert_remediation") return "Alert remediation";
  if (type === "inventory") return "Inventory";
  return type;
}

function settingsOf(policy: Policy) {
  if (!policy.settings_json) return {} as Record<string, unknown>;
  if (typeof policy.settings_json === "string") {
    try {
      return JSON.parse(policy.settings_json) as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  }
  return policy.settings_json as Record<string, unknown>;
}

function parseSelectedDevices(text: string) {
  return text
    .split(/[\n,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function policyToForm(policy: Policy): FormState {
  const settings = settingsOf(policy);
  const targetIDs = Array.isArray(policy.target_device_ids) ? policy.target_device_ids.join("\n") : "";

  return {
    policy_id: policy.policy_id,
    name: policy.name,
    policy_type: (policy.policy_type as FormState["policy_type"]) || "inventory",
    enabled: !!policy.enabled,
    interval_minutes: policy.interval_minutes || 360,
    target_scope: policy.target_scope === "selected" ? "selected" : "all_online",
    target_device_ids_text: targetIDs,
    update_mode: (settings.mode as FormState["update_mode"]) || "scan",
    include_drivers: settings.include_drivers === true,
  };
}

export default function PoliciesClient() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/control/policies", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `Failed to load policies (${res.status})`);
    }
    setPolicies(Array.isArray(json.policies) ? json.policies : []);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Failed to load policies"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  const selectedPolicy = useMemo(() => {
    if (!form.policy_id) return null;
    return policies.find((p) => p.policy_id === form.policy_id) ?? null;
  }, [form.policy_id, policies]);

  async function savePolicy() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const settings: Record<string, unknown> = {};
      if (form.policy_type === "windows_update") {
        settings.mode = form.update_mode;
        settings.include_drivers = form.include_drivers;
      }

      const body = {
        policy_id: form.policy_id,
        name: form.name,
        policy_type: form.policy_type,
        enabled: form.enabled,
        interval_minutes: Number(form.interval_minutes) || 360,
        target_scope: form.target_scope,
        target_device_ids: form.target_scope === "selected" ? parseSelectedDevices(form.target_device_ids_text) : [],
        settings_json: settings,
      };

      const res = await fetch("/api/control/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Save failed (${res.status})`);
      }
      setNotice("Policy saved");
      setForm(policyToForm(json.policy));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function runDuePolicies() {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/control/policies/run-due", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Run due policies failed (${res.status})`);
      }
      const count = Array.isArray(json.results) ? json.results.length : 0;
      setNotice(`Policy scheduler ran. ${count} due polic${count === 1 ? "y" : "ies"} processed.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run due policies failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border hi5-border bg-white/80 p-5 shadow-sm dark:bg-neutral-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
              <CalendarClock size={18} /> Policy automation
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Policies & automations</h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
              Schedule recurring RMM actions through the agent action queue. This first pass supports inventory refreshes, Windows Update scans/installs/history, and remediation refresh jobs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border hi5-border px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => void runDuePolicies()}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Play size={16} /> {running ? "Running..." : "Run due now"}
            </button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">{error}</div> : null}
        {notice ? <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">{notice}</div> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <div className="rounded-2xl border hi5-border bg-white/80 p-5 shadow-sm dark:bg-neutral-950/70">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{selectedPolicy ? "Edit policy" : "Create policy"}</h2>
            {selectedPolicy ? (
              <button
                type="button"
                onClick={() => setForm(DEFAULT_FORM)}
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-300"
              >
                New policy
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium">
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900"
              />
            </label>

            <label className="block text-sm font-medium">
              Policy type
              <select
                value={form.policy_type}
                onChange={(e) => setForm((f) => ({ ...f, policy_type: e.target.value as FormState["policy_type"] }))}
                className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900"
              >
                <option value="inventory">Inventory refresh</option>
                <option value="windows_update">Windows Update</option>
                <option value="alert_remediation">Alert/remediation refresh</option>
              </select>
            </label>

            {form.policy_type === "windows_update" ? (
              <div className="rounded-xl border hi5-border bg-neutral-50 p-3 dark:bg-neutral-900/60">
                <label className="block text-sm font-medium">
                  Windows Update action
                  <select
                    value={form.update_mode}
                    onChange={(e) => setForm((f) => ({ ...f, update_mode: e.target.value as FormState["update_mode"] }))}
                    className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900"
                  >
                    <option value="scan">Scan pending updates</option>
                    <option value="install_all">Install all pending updates</option>
                    <option value="history">Collect update history</option>
                  </select>
                </label>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.include_drivers}
                    onChange={(e) => setForm((f) => ({ ...f, include_drivers: e.target.checked }))}
                  />
                  Include driver updates
                </label>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">
                Interval minutes
                <input
                  type="number"
                  min={5}
                  value={form.interval_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, interval_minutes: Number(e.target.value) }))}
                  className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900"
                />
              </label>
              <label className="block text-sm font-medium">
                Targets
                <select
                  value={form.target_scope}
                  onChange={(e) => setForm((f) => ({ ...f, target_scope: e.target.value as FormState["target_scope"] }))}
                  className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 dark:bg-neutral-900"
                >
                  <option value="all_online">All online devices</option>
                  <option value="selected">Selected device IDs</option>
                </select>
              </label>
            </div>

            {form.target_scope === "selected" ? (
              <label className="block text-sm font-medium">
                Device IDs
                <textarea
                  value={form.target_device_ids_text}
                  onChange={(e) => setForm((f) => ({ ...f, target_device_ids_text: e.target.value }))}
                  placeholder="One device ID per line"
                  rows={4}
                  className="mt-1 w-full rounded-xl border hi5-border bg-white px-3 py-2 font-mono text-xs dark:bg-neutral-900"
                />
              </label>
            ) : null}

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              Enabled
            </label>

            <button
              type="button"
              onClick={() => void savePolicy()}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save policy"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border hi5-border bg-white/80 shadow-sm dark:bg-neutral-950/70">
          <div className="border-b hi5-border p-5">
            <h2 className="text-lg font-semibold">Configured policies</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Policy-created work appears in the normal device Jobs tab and global Jobs page.</p>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-neutral-500">Loading policies...</div>
          ) : policies.length === 0 ? (
            <div className="p-6 text-sm text-neutral-500">No policies yet. Create your first inventory or Windows Update policy.</div>
          ) : (
            <div className="divide-y hi5-border">
              {policies.map((policy) => {
                const settings = settingsOf(policy);
                return (
                  <div key={policy.policy_id} className="p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <button
                        type="button"
                        onClick={() => setForm(policyToForm(policy))}
                        className="flex min-w-0 items-start gap-3 text-left"
                      >
                        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                          {policyIcon(policy.policy_type)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{policy.name}</span>
                          <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">
                            {policyTypeLabel(policy.policy_type)} • every {policy.interval_minutes} min • {policy.target_scope === "selected" ? "selected devices" : "all online devices"}
                          </span>
                          {policy.policy_type === "windows_update" ? (
                            <span className="mt-1 block text-xs text-neutral-500">
                              Mode: {String(settings.mode || "scan")} • Drivers: {settings.include_drivers ? "included" : "excluded"}
                            </span>
                          ) : null}
                        </span>
                      </button>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${policy.enabled ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"}`}>
                          {policy.enabled ? "Enabled" : "Disabled"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setForm(policyToForm(policy))}
                          className="rounded-full border hi5-border px-2.5 py-1 font-medium hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-xs text-neutral-600 dark:text-neutral-400 md:grid-cols-3">
                      <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/60">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">Last run</div>
                        <div className="mt-1">{formatDate(policy.last_run_at)}</div>
                      </div>
                      <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/60">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">Next run</div>
                        <div className="mt-1">{formatDate(policy.next_run_at)}</div>
                      </div>
                      <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/60">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">Last result</div>
                        <div className="mt-1">{policy.last_run_summary || "—"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border hi5-border bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <strong>Next:</strong> third-party software updates should plug into this same queue using actions such as <code>scan_software_updates</code>, <code>install_software_update</code>, and <code>install_software_policy</code>.
      </div>
    </div>
  );
}
