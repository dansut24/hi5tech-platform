"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clipboard, Download, Plus, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

type DeviceGroup = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
};

type EnrollmentPackage = {
  id: string;
  tenant_id: string;
  group_id: string | null;
  policy_id?: string | null;
  name: string;
  status: "active" | "revoked";
  secret_hint?: string | null;
  package_type?: string | null;
  install_source?: string | null;
  created_at: string;
  revoked_at?: string | null;
  last_synced_at?: string | null;
};

type CreatePackageResponse = {
  package: EnrollmentPackage;
  bootstrap_secret: string;
  sync_warning?: string | null;
};

const AGENT_FILE_NAME = "Hi5TechAgentSetup.exe";
const AGENT_DOWNLOAD_PATH = `/downloads/${AGENT_FILE_NAME}`;
const DEFAULT_RMM_API_BASE_URL = "https://rmm.hi5tech.co.uk";
const DEFAULT_AGENT_WS_BASE_URL = "wss://rmm.hi5tech.co.uk/agent/ws";

function psSingleQuote(value: string) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function createEnrollmentToken(pkg: EnrollmentPackage, bootstrapSecret: string) {
  return `${pkg.id}.${bootstrapSecret}`;
}

function buildInstallCommand(input: {
  origin: string;
  tenantId: string;
  groupId: string;
  packageId: string;
  enrollmentToken: string;
  apiBaseUrl: string;
  agentWsBaseUrl: string;
}) {
  const downloadUrl = `${input.origin.replace(/\/+$/, "")}${AGENT_DOWNLOAD_PATH}`;

  return [
    `$Installer = Join-Path $env:TEMP ${psSingleQuote(AGENT_FILE_NAME)}`,
    `$DownloadUrl = ${psSingleQuote(downloadUrl)}`,
    `Invoke-WebRequest -Uri $DownloadUrl -OutFile $Installer`,
    `Start-Process -FilePath $Installer -Verb RunAs -Wait -ArgumentList @(`,
    `  '/VERYSILENT',`,
    `  '/NORESTART',`,
    `  '/SUPPRESSMSGBOXES',`,
    `  ${psSingleQuote(`/API_BASE_URL=${input.apiBaseUrl}`)},`,
    `  ${psSingleQuote(`/AGENT_WS_BASE_URL=${input.agentWsBaseUrl}`)},`,
    `  ${psSingleQuote(`/ENROLLMENT_TOKEN=${input.enrollmentToken}`)},`,
    `  ${psSingleQuote(`/TENANT_ID=${input.tenantId}`)},`,
    `  ${psSingleQuote(`/GROUP_ID=${input.groupId}`)},`,
    `  ${psSingleQuote(`/PACKAGE_ID=${input.packageId}`)},`,
    `  '/INSTALL_SOURCE=rmm-portal'`,
    `)`,
  ].join("\n");
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function groupLabel(groups: DeviceGroup[], groupId: string | null | undefined) {
  if (!groupId || groupId === "default") return "Default";
  const group = groups.find((g) => g.id === groupId || g.slug === groupId);
  return group ? group.name : groupId;
}

export default function AgentDownloadClient() {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [packages, setPackages] = useState<EnrollmentPackage[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("default");
  const [newGroupName, setNewGroupName] = useState("");
  const [name, setName] = useState("Windows Agent - Default Group");
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_RMM_API_BASE_URL);
  const [agentWsBaseUrl, setAgentWsBaseUrl] = useState(DEFAULT_AGENT_WS_BASE_URL);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatePackageResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId || g.slug === selectedGroupId),
    [groups, selectedGroupId]
  );

  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.status === "active"),
    [packages]
  );

  const installCommand = useMemo(() => {
    if (!created) return "";

    return buildInstallCommand({
      origin,
      tenantId: created.package.tenant_id,
      groupId: created.package.group_id || "default",
      packageId: created.package.id,
      enrollmentToken: createEnrollmentToken(created.package, created.bootstrap_secret),
      apiBaseUrl: apiBaseUrl.trim().replace(/\/+$/, ""),
      agentWsBaseUrl: agentWsBaseUrl.trim().replace(/\/+$/, ""),
    });
  }, [agentWsBaseUrl, apiBaseUrl, created, origin]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [groupsRes, packagesRes] = await Promise.all([
        fetch("/api/control/device-groups", { cache: "no-store" }),
        fetch("/api/admin/enrollment-packages", { cache: "no-store" }),
      ]);

      const groupsJson = await groupsRes.json().catch(() => null);
      const packagesJson = await packagesRes.json().catch(() => null);

      if (!groupsRes.ok) throw new Error(groupsJson?.error || "Failed to load device groups");
      if (!packagesRes.ok) throw new Error(packagesJson?.error || "Failed to load enrollment packages");

      const loadedGroups = groupsJson?.groups ?? [];
      setGroups(loadedGroups);
      setPackages(packagesJson?.packages ?? []);

      if (loadedGroups.length > 0 && !loadedGroups.some((g: DeviceGroup) => g.id === selectedGroupId || g.slug === selectedGroupId)) {
        setSelectedGroupId(loadedGroups[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent download data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const label = selectedGroup?.name || (selectedGroupId === "default" ? "Default" : selectedGroupId);
    setName(`Windows Agent - ${label}`);
  }, [selectedGroup?.name, selectedGroupId]);

  async function createGroup() {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    setCreatingGroup(true);
    setError(null);
    try {
      const res = await fetch("/api/control/device-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to create group (${res.status})`);

      setNewGroupName("");
      await refresh();
      if (json?.group?.id) setSelectedGroupId(json.group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function createPackage() {
    setCreating(true);
    setError(null);
    setWarning(null);
    setCopied(false);

    try {
      const res = await fetch("/api/admin/enrollment-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Windows Agent Enrollment",
          group_id: selectedGroupId || "default",
          package_type: "windows-x64",
          install_source: "rmm-portal",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to create package (${res.status})`);
      }

      const createdResponse = json as CreatePackageResponse;
      setCreated(createdResponse);
      if (createdResponse.sync_warning) setWarning(createdResponse.sync_warning);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create enrollment package");
    } finally {
      setCreating(false);
    }
  }

  async function revokePackage(id: string) {
    setRevokingId(id);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/admin/enrollment-packages/revoke?id=${encodeURIComponent(id)}`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to revoke package (${res.status})`);
      if (json?.sync_warning) setWarning(json.sync_warning);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke package");
    } finally {
      setRevokingId(null);
    }
  }

  async function copyCommand() {
    if (!installCommand) return;
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadCommand() {
    if (!installCommand || !created) return;
    const safeGroup = groupLabel(groups, created.package.group_id).replace(/[^a-z0-9_-]+/gi, "-");
    downloadText(`Install-Hi5TechAgent-${safeGroup}.ps1`, installCommand);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[.9fr_1.1fr] gap-4">
        <section className="hi5-panel p-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[rgb(var(--hi5-accent)/.14)] flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-lg font-bold">Generate Windows agent install command</div>
              <p className="text-sm opacity-70 mt-1">
                Create a long-lived tenant package. It remains active until revoked and enrolls devices straight into the selected group.
              </p>
            </div>
          </div>

          {loading ? <div className="text-sm opacity-70">Loading groups and packages…</div> : null}

          <div className="rounded-2xl border hi5-border p-4 space-y-3">
            <div className="text-sm font-semibold">Device group</div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <select
                className="hi5-input"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
                {groups.length === 0 ? <option value="default">Default</option> : null}
              </select>
              <button type="button" className="hi5-btn-ghost text-sm inline-flex items-center gap-2" onClick={refresh}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <input
                className="hi5-input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Create a new group, e.g. Laptops"
              />
              <button
                type="button"
                className="hi5-btn-primary text-sm inline-flex items-center gap-2"
                onClick={createGroup}
                disabled={creatingGroup || !newGroupName.trim()}
              >
                <Plus size={15} /> {creatingGroup ? "Creating…" : "Create group"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm sm:col-span-2">
              <div className="text-xs opacity-70 mb-1">Package name</div>
              <input
                className="hi5-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dansworld - Laptops"
              />
            </label>

            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Install package</div>
              <input className="hi5-input" value="windows-x64" readOnly />
            </label>

            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Package lifetime</div>
              <input className="hi5-input" value="Always active until revoked" readOnly />
            </label>

            <label className="block text-sm sm:col-span-2">
              <div className="text-xs opacity-70 mb-1">Agent API base URL</div>
              <input
                className="hi5-input"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
              />
            </label>

            <label className="block text-sm sm:col-span-2">
              <div className="text-xs opacity-70 mb-1">Agent WebSocket URL</div>
              <input
                className="hi5-input"
                value={agentWsBaseUrl}
                onChange={(e) => setAgentWsBaseUrl(e.target.value)}
              />
            </label>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {warning ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-200">
              Control server sync warning: {warning}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="hi5-btn-primary text-sm inline-flex items-center gap-2"
              onClick={createPackage}
              disabled={creating}
            >
              {creating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? "Generating…" : created ? "Generate new command" : "Generate command"}
            </button>

            <a href={AGENT_DOWNLOAD_PATH} download className="hi5-btn-ghost text-sm inline-flex items-center gap-2">
              <Download size={16} />
              Download installer only
            </a>

            <Link href="/control/devices" className="hi5-btn-ghost text-sm">
              Back to Devices
            </Link>
          </div>

          <div className="rounded-2xl border hi5-border p-3 text-xs opacity-75">
            The installer download is tenant-domain relative. On this tenant it resolves to{" "}
            <span className="font-mono break-all">{origin || "https://tenant.hi5tech.co.uk"}{AGENT_DOWNLOAD_PATH}</span>.
          </div>
        </section>

        <section className="hi5-panel p-5 space-y-4">
          <div>
            <div className="text-lg font-bold">PowerShell install command</div>
            <p className="text-sm opacity-70 mt-1">
              Run this from the target Windows device. It downloads the installer, asks for admin, installs the service, and enrolls into the selected group.
            </p>
          </div>

          {created ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border hi5-border p-3">
                  <div className="text-xs opacity-60">Tenant ID</div>
                  <div className="font-mono text-xs mt-1 break-all">{created.package.tenant_id}</div>
                </div>
                <div className="rounded-2xl border hi5-border p-3">
                  <div className="text-xs opacity-60">Group</div>
                  <div className="font-mono text-xs mt-1 break-all">{groupLabel(groups, created.package.group_id)}</div>
                </div>
                <div className="rounded-2xl border hi5-border p-3">
                  <div className="text-xs opacity-60">Package</div>
                  <div className="font-mono text-xs mt-1 break-all">{created.package.id}</div>
                </div>
              </div>

              <pre className="max-h-[430px] overflow-auto rounded-2xl border hi5-border bg-black/90 p-4 text-xs text-white whitespace-pre-wrap break-words">
                {installCommand}
              </pre>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="hi5-btn-primary text-sm inline-flex items-center gap-2" onClick={copyCommand}>
                  {copied ? <Check size={16} /> : <Clipboard size={16} />}
                  {copied ? "Copied" : "Copy command"}
                </button>
                <button type="button" className="hi5-btn-ghost text-sm" onClick={downloadCommand}>
                  Download .ps1
                </button>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-200">
                Save this command now. The enrollment secret is only shown at creation time. The package remains active until revoked.
              </div>
            </>
          ) : (
            <div className="rounded-2xl border hi5-border p-6 text-sm opacity-75">
              No command generated yet. Choose a group and click <span className="font-semibold">Generate command</span>.
            </div>
          )}
        </section>
      </div>

      <section className="hi5-panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-bold">Active enrollment packages</div>
            <p className="text-sm opacity-70 mt-1">These packages are valid until revoked. Revoking blocks future installs with that command.</p>
          </div>
          <button type="button" className="hi5-btn-ghost text-sm inline-flex items-center gap-2" onClick={refresh}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <div className="mt-4 overflow-auto rounded-2xl border hi5-border">
          <table className="w-full text-sm">
            <thead className="text-left text-xs opacity-70 border-b hi5-border">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Secret</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {activePackages.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center opacity-70" colSpan={6}>No active enrollment packages yet.</td>
                </tr>
              ) : (
                activePackages.map((pkg) => (
                  <tr key={pkg.id} className="border-b hi5-border last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="font-semibold">{pkg.name}</div>
                      <div className="font-mono text-[11px] opacity-60 break-all">{pkg.id}</div>
                    </td>
                    <td className="px-3 py-3">{groupLabel(groups, pkg.group_id)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-1 text-xs font-semibold">
                        Active until revoked
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs opacity-75">{pkg.secret_hint || "—"}</td>
                    <td className="px-3 py-3 text-xs opacity-75">{new Date(pkg.created_at).toLocaleString()}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        className="hi5-btn-ghost text-xs inline-flex items-center gap-1"
                        onClick={() => revokePackage(pkg.id)}
                        disabled={revokingId === pkg.id}
                      >
                        <XCircle size={14} /> {revokingId === pkg.id ? "Revoking…" : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
