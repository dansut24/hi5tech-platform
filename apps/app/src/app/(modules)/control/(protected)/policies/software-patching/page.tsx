"use client";

import { useEffect, useMemo, useState } from "react";

type PolicyItem = {
  id: string;
  winget_id: string;
  software_name: string;
  vendor: string;
  enabled: boolean;
  auto_approve: boolean;
};

type PolicyTarget = {
  id: string;
  target_type: string;
  target_id: string;
};

type SoftwarePatchPolicy = {
  id: string;
  name: string;
  enabled: boolean;
  scan_schedule: any;
  patch_schedule: any;
  offline_mode: string;
  reboot_mode: string;
  created_at: string;
  updated_at: string;
  items?: PolicyItem[];
  targets?: PolicyTarget[];
};

const TENANT_ID = "bff625ff-230d-4362-8963-3709d1a785b9";

const DEFAULT_DEVICE_ID = "TEm_smll5nZgSqd43KJEylEn";

const DEFAULT_SOFTWARE = [
  { wingetId: "Google.Chrome", softwareName: "Google Chrome", vendor: "Google LLC" },
  { wingetId: "Notepad++.Notepad++", softwareName: "Notepad++", vendor: "Notepad++ Team" },
  { wingetId: "RustDesk.RustDesk", softwareName: "RustDesk", vendor: "RustDesk" },
  { wingetId: "Microsoft.Edge", softwareName: "Microsoft Edge", vendor: "Microsoft Corporation" },
  { wingetId: "Mozilla.Firefox", softwareName: "Mozilla Firefox", vendor: "Mozilla" },
  { wingetId: "7zip.7zip", softwareName: "7-Zip", vendor: "Igor Pavlov" },
  { wingetId: "Git.Git", softwareName: "Git", vendor: "Git" },
  { wingetId: "VideoLAN.VLC", softwareName: "VLC media player", vendor: "VideoLAN" }
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SoftwarePatchingPoliciesPage() {
  const [policies, setPolicies] = useState<SoftwarePatchPolicy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [newPolicyName, setNewPolicyName] = useState("Default software patching");
  const [scanTime, setScanTime] = useState("10:00");
  const [patchTime, setPatchTime] = useState("15:00");
  const [softwareSearch, setSoftwareSearch] = useState("");
  const [customWingetId, setCustomWingetId] = useState("");
  const [customSoftwareName, setCustomSoftwareName] = useState("");
  const [customVendor, setCustomVendor] = useState("");
  const [targetDeviceId, setTargetDeviceId] = useState(DEFAULT_DEVICE_ID);

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === selectedPolicyId) || policies[0],
    [policies, selectedPolicyId]
  );

  const selectedWingetIds = useMemo(
    () => new Set((selectedPolicy?.items || []).map((item) => item.winget_id)),
    [selectedPolicy]
  );

  const filteredSoftware = useMemo(() => {
    const query = softwareSearch.trim().toLowerCase();

    if (!query) return DEFAULT_SOFTWARE;

    return DEFAULT_SOFTWARE.filter((item) =>
      [item.wingetId, item.softwareName, item.vendor]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [softwareSearch]);

  async function loadPolicies() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/admin/software-patch-policies?tenant_id=${encodeURIComponent(TENANT_ID)}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to load policies");
      }

      setPolicies(json.policies || []);

      if (!selectedPolicyId && json.policies?.[0]?.id) {
        setSelectedPolicyId(json.policies[0].id);
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPolicy() {
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/software-patch-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          name: newPolicyName,
          enabled: true,
          scanSchedule: {
            enabled: true,
            frequency: "daily",
            time: scanTime,
            timezone: "Europe/London"
          },
          patchSchedule: {
            enabled: true,
            frequency: "daily",
            time: patchTime,
            timezone: "Europe/London"
          },
          offlineMode: "run_when_online",
          rebootMode: "no_reboot",
          targets: [
            {
              targetType: "device",
              targetId: targetDeviceId
            }
          ]
        })
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to create policy");
      }

      setSelectedPolicyId(json.policyId);
      setMessage("Policy created.");
      await loadPolicies();
    } catch (error: any) {
      setMessage(error.message || "Failed to create policy");
    } finally {
      setBusy(false);
    }
  }

  async function addSoftware(item: {
    wingetId: string;
    softwareName: string;
    vendor: string;
  }) {
    if (!selectedPolicy) return;

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/admin/software-patch-policies/${selectedPolicy.id}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wingetId: item.wingetId,
            softwareName: item.softwareName,
            vendor: item.vendor,
            enabled: true,
            autoApprove: true
          })
        }
      );

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to add software");
      }

      setMessage(
        json.skippedDuplicates
          ? "Software already exists in this policy."
          : "Software added to policy."
      );

      await loadPolicies();
    } catch (error: any) {
      setMessage(error.message || "Failed to add software");
    } finally {
      setBusy(false);
    }
  }

  async function addCustomSoftware() {
    if (!customWingetId.trim()) {
      setMessage("Enter a WinGet ID first.");
      return;
    }

    await addSoftware({
      wingetId: customWingetId.trim(),
      softwareName: customSoftwareName.trim() || customWingetId.trim(),
      vendor: customVendor.trim()
    });

    setCustomWingetId("");
    setCustomSoftwareName("");
    setCustomVendor("");
  }

  async function removeSoftware(item: PolicyItem) {
    if (!selectedPolicy) return;

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/admin/software-patch-policies/${selectedPolicy.id}/items?item_id=${encodeURIComponent(item.id)}`,
        {
          method: "DELETE"
        }
      );

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to remove software");
      }

      setMessage("Software removed from policy.");
      await loadPolicies();
    } catch (error: any) {
      setMessage(error.message || "Failed to remove software");
    } finally {
      setBusy(false);
    }
  }

  async function addTarget() {
    if (!selectedPolicy || !targetDeviceId.trim()) return;

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/admin/software-patch-policies/${selectedPolicy.id}/targets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: "device",
            targetId: targetDeviceId.trim()
          })
        }
      );

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to add target");
      }

      setMessage(
        json.skippedDuplicates
          ? "Target already exists in this policy."
          : "Target added to policy."
      );

      await loadPolicies();
    } catch (error: any) {
      setMessage(error.message || "Failed to add target");
    } finally {
      setBusy(false);
    }
  }

  async function removeTarget(target: PolicyTarget) {
    if (!selectedPolicy) return;

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/admin/software-patch-policies/${selectedPolicy.id}/targets?target_row_id=${encodeURIComponent(target.id)}`,
        {
          method: "DELETE"
        }
      );

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to remove target");
      }

      setMessage("Target removed from policy.");
      await loadPolicies();
    } catch (error: any) {
      setMessage(error.message || "Failed to remove target");
    } finally {
      setBusy(false);
    }
  }

  async function runScanNow() {
    if (!selectedPolicy) return;

    setBusy(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/admin/software-patch-policies/${selectedPolicy.id}/run-scan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: TENANT_ID
          })
        }
      );

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to run scan");
      }

      setMessage(
        `Scan complete. Devices: ${json.deviceCount}. Jobs queued: ${json.jobCount}.`
      );
    } catch (error: any) {
      setMessage(error.message || "Failed to run scan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">Control / Policies</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                Software Patching
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Create software patching policies, choose approved applications, assign target devices,
                and queue scheduled patch jobs based on detected installed software.
              </p>
            </div>

            <button
              onClick={runScanNow}
              disabled={!selectedPolicy || busy}
              className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working..." : "Run scan now"}
            </button>
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {message}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-semibold text-white">Create policy</h2>

              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="text-slate-300">Policy name</span>
                  <input
                    value={newPolicyName}
                    onChange={(event) => setNewPolicyName(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="text-slate-300">Scan time</span>
                    <input
                      type="time"
                      value={scanTime}
                      onChange={(event) => setScanTime(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="text-slate-300">Patch time</span>
                    <input
                      type="time"
                      value={patchTime}
                      onChange={(event) => setPatchTime(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="text-slate-300">Initial target device</span>
                  <input
                    value={targetDeviceId}
                    onChange={(event) => setTargetDeviceId(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                </label>

                <button
                  onClick={createPolicy}
                  disabled={busy || !newPolicyName.trim()}
                  className="w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create policy
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-semibold text-white">Policies</h2>

              <div className="mt-4 space-y-2">
                {loading ? (
                  <p className="text-sm text-slate-400">Loading policies...</p>
                ) : policies.length === 0 ? (
                  <p className="text-sm text-slate-400">No software patching policies yet.</p>
                ) : (
                  policies.map((policy) => (
                    <button
                      key={policy.id}
                      onClick={() => setSelectedPolicyId(policy.id)}
                      className={cx(
                        "w-full rounded-2xl border px-4 py-3 text-left transition",
                        selectedPolicy?.id === policy.id
                          ? "border-cyan-400/60 bg-cyan-400/10"
                          : "border-white/10 bg-slate-900/60 hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{policy.name}</p>
                        <span
                          className={cx(
                            "rounded-full px-2 py-1 text-xs",
                            policy.enabled
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-slate-700 text-slate-300"
                          )}
                        >
                          {policy.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Scan {policy.scan_schedule?.time || "—"} · Patch{" "}
                        {policy.patch_schedule?.time || "—"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedPolicy?.name || "No policy selected"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Offline mode: {selectedPolicy?.offline_mode || "—"} · Reboot mode:{" "}
                    {selectedPolicy?.reboot_mode || "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-900 px-4 py-3">
                    <p className="text-slate-400">Scan</p>
                    <p className="font-semibold text-white">
                      {selectedPolicy?.scan_schedule?.frequency || "—"}{" "}
                      {selectedPolicy?.scan_schedule?.time || ""}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-900 px-4 py-3">
                    <p className="text-slate-400">Patch</p>
                    <p className="font-semibold text-white">
                      {selectedPolicy?.patch_schedule?.frequency || "—"}{" "}
                      {selectedPolicy?.patch_schedule?.time || ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">Selected software</h3>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {selectedPolicy?.items?.length || 0} apps
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {(selectedPolicy?.items || []).length === 0 ? (
                    <p className="text-sm text-slate-400">No software selected yet.</p>
                  ) : (
                    selectedPolicy?.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-white">{item.software_name}</p>
                          <p className="text-xs text-slate-400">{item.winget_id}</p>
                        </div>
                        <button
                          onClick={() => removeSoftware(item)}
                          disabled={busy}
                          className="rounded-xl border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">Targets</h3>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {selectedPolicy?.targets?.length || 0} targets
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={targetDeviceId}
                    onChange={(event) => setTargetDeviceId(event.target.value)}
                    placeholder="Device ID"
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={addTarget}
                    disabled={busy || !selectedPolicy}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {(selectedPolicy?.targets || []).length === 0 ? (
                    <p className="text-sm text-slate-400">No targets assigned.</p>
                  ) : (
                    selectedPolicy?.targets?.map((target) => (
                      <div
                        key={target.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-white">{target.target_id}</p>
                          <p className="text-xs text-slate-400">{target.target_type}</p>
                        </div>
                        <button
                          onClick={() => removeTarget(target)}
                          disabled={busy}
                          className="rounded-xl border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Add software</h3>
                  <p className="text-sm text-slate-400">
                    Choose from common managed apps or add a custom WinGet ID.
                  </p>
                </div>

                <input
                  value={softwareSearch}
                  onChange={(event) => setSoftwareSearch(event.target.value)}
                  placeholder="Search software..."
                  className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {filteredSoftware.map((item) => {
                  const selected = selectedWingetIds.has(item.wingetId);

                  return (
                    <button
                      key={item.wingetId}
                      onClick={() => addSoftware(item)}
                      disabled={busy || selected || !selectedPolicy}
                      className={cx(
                        "rounded-2xl border px-4 py-3 text-left transition",
                        selected
                          ? "border-emerald-400/30 bg-emerald-400/10"
                          : "border-white/10 bg-slate-900 hover:bg-slate-800",
                        "disabled:cursor-not-allowed disabled:opacity-60"
                      )}
                    >
                      <p className="font-medium text-white">{item.softwareName}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.wingetId}</p>
                      <p className="mt-2 text-xs text-cyan-300">
                        {selected ? "Selected" : "Add to policy"}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 rounded-3xl border border-white/10 bg-slate-900 p-4 md:grid-cols-4">
                <input
                  value={customWingetId}
                  onChange={(event) => setCustomWingetId(event.target.value)}
                  placeholder="WinGet ID"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
                <input
                  value={customSoftwareName}
                  onChange={(event) => setCustomSoftwareName(event.target.value)}
                  placeholder="Software name"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
                <input
                  value={customVendor}
                  onChange={(event) => setCustomVendor(event.target.value)}
                  placeholder="Vendor"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                />
                <button
                  onClick={addCustomSoftware}
                  disabled={busy || !customWingetId.trim() || !selectedPolicy}
                  className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  Add custom
                </button>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
