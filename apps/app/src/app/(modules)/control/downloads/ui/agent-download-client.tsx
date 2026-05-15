"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Clipboard,
  Download,
  FileCode2,
  Info,
  Laptop,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  XCircle,
} from "lucide-react";

type DeviceGroup = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
};

type InstallerStatus = "not_requested" | "building" | "ready" | "failed" | string;

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
  installer_status?: InstallerStatus | null;
  installer_file_path?: string | null;
  installer_filename?: string | null;
  installer_requested_at?: string | null;
  installer_generated_at?: string | null;
  installer_error?: string | null;
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

function safeFilePart(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "Default"
  );
}

function getTenantSlugFromOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    return safeFilePart(host.split(".")[0] || "Tenant");
  } catch {
    return "Tenant";
  }
}

function groupLabel(groups: DeviceGroup[], groupId: string | null | undefined) {
  if (!groupId || groupId === "default") return "Default";
  const group = groups.find((g) => g.id === groupId || g.slug === groupId);
  return group ? group.name : groupId;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    ``,
    `Invoke-WebRequest -Uri $DownloadUrl -OutFile $Installer`,
    ``,
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

function buildProvisionedDownloadUrl(packageId: string) {
  return `/api/admin/enrollment-packages/download/exe?id=${encodeURIComponent(packageId)}`;
}

function buildGenericNamedDownloadUrl(packageId: string) {
  return `/api/admin/enrollment-packages/download/exe?id=${encodeURIComponent(packageId)}&generic=1`;
}

function buildSilentCommand() {
  return `${AGENT_FILE_NAME} /VERYSILENT /NORESTART /SUPPRESSMSGBOXES`;
}

function buildIntuneUninstallCommand() {
  return `"C:\\Program Files\\Hi5Tech\\Agent\\native_vp8_stream.exe" --uninstall-service`;
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

function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className = "hi5-btn-ghost text-sm",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button type="button" className={className} onClick={copy} disabled={!value}>
      <span className="inline-flex items-center gap-2">
        {copied ? <Check size={16} /> : <Clipboard size={16} />}
        {copied ? copiedLabel : label}
      </span>
    </button>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-2xl border hi5-border bg-white/45 dark:bg-black/25 flex items-center justify-center">
          {icon}
        </div>

        <div>
          <div className="text-sm font-bold">{title}</div>
          <div className="text-sm opacity-75 mt-1 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({
  value,
  minHeight = "min-h-[88px]",
}: {
  value: string;
  minHeight?: string;
}) {
  return (
    <pre
      className={[
        "overflow-auto rounded-2xl border hi5-border bg-black/90 p-4 text-xs text-white whitespace-pre-wrap break-words",
        minHeight,
      ].join(" ")}
    >
      {value}
    </pre>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <div className="text-lg font-bold">{title}</div>
      {description ? (
        <p className="text-sm opacity-70 mt-1 leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "good" | "warning" | "bad" | "neutral" | "info";
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/25"
        : tone === "bad"
          ? "bg-red-500/10 text-red-700 dark:text-red-200 border-red-500/25"
          : tone === "info"
            ? "bg-sky-500/10 text-sky-700 dark:text-sky-200 border-sky-500/25"
            : "bg-black/5 dark:bg-white/5 hi5-border";

  return (
    <span className={["inline-flex rounded-full border px-2 py-1 text-xs font-semibold", cls].join(" ")}>
      {children}
    </span>
  );
}

function installerStatusTone(status?: InstallerStatus | null) {
  if (status === "ready") return "good";
  if (status === "building") return "info";
  if (status === "failed") return "bad";
  return "warning";
}

function installerStatusLabel(status?: InstallerStatus | null) {
  if (status === "ready") return "Ready";
  if (status === "building") return "Building";
  if (status === "failed") return "Failed";
  return "Not built";
}

export default function AgentDownloadClient() {
  const [requestedGroupId, setRequestedGroupId] = useState<string | null>(null);
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
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatePackageResponse | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId || g.slug === selectedGroupId),
    [groups, selectedGroupId]
  );

  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.status === "active"),
    [packages]
  );

  const anyBuilding = activePackages.some((pkg) => pkg.installer_status === "building");

  const tenantSlug = getTenantSlugFromOrigin(origin || "https://tenant.hi5tech.co.uk");
  const selectedGroupName = selectedGroup?.name || (selectedGroupId === "default" ? "Default" : selectedGroupId);
  const tenantAwareDownloadUrl = `${origin || "https://tenant.hi5tech.co.uk"}${AGENT_DOWNLOAD_PATH}`;
  const silentCommand = buildSilentCommand();
  const intuneUninstallCommand = buildIntuneUninstallCommand();

  const previewFileName = `${safeFilePart(tenantSlug)}-${safeFilePart(selectedGroupName)}-Hi5TechAgentSetup.exe`;

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
      const loadedPackages = packagesJson?.packages ?? [];

      setGroups(loadedGroups);
      setPackages(loadedPackages);

      if (created) {
        const updatedCreated = loadedPackages.find((pkg: EnrollmentPackage) => pkg.id === created.package.id);
        if (updatedCreated) {
          setCreated({ ...created, package: updatedCreated });
        }
      }

      if (requestedGroupId) {
        const requested = loadedGroups.find(
          (g: DeviceGroup) => g.id === requestedGroupId || g.slug === requestedGroupId
        );

        if (requested) {
          setSelectedGroupId(requested.id);
        } else if (requestedGroupId === "default") {
          setSelectedGroupId("default");
        }
      } else if (
        loadedGroups.length > 0 &&
        !loadedGroups.some((g: DeviceGroup) => g.id === selectedGroupId || g.slug === selectedGroupId)
      ) {
        setSelectedGroupId(loadedGroups[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent download data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRequestedGroupId(new URLSearchParams(window.location.search).get("group_id"));
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedGroupId]);

  useEffect(() => {
    if (!anyBuilding) return;

    const timer = window.setInterval(() => {
      refresh();
    }, 8000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyBuilding]);

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

      if (json?.group?.id) {
        setSelectedGroupId(json.group.id);
      }
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
      if (!res.ok) throw new Error(json?.error || `Failed to create package (${res.status})`);

      const createdResponse = json as CreatePackageResponse;
      setCreated(createdResponse);

      if (createdResponse.sync_warning) {
        setWarning(createdResponse.sync_warning);
      }

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create enrollment package");
    } finally {
      setCreating(false);
    }
  }

  async function buildProvisionedInstaller() {
    if (!created) return;

    setBuildingId(created.package.id);
    setError(null);
    setWarning(null);

    try {
      const res = await fetch("/api/admin/enrollment-packages/build-installer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: created.package.id,
          bootstrap_secret: created.bootstrap_secret,
          api_base_url: apiBaseUrl,
          agent_ws_base_url: agentWsBaseUrl,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to start installer build (${res.status})`);

      if (json?.package) {
        setCreated({ ...created, package: json.package });
      }

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start provisioned installer build");
    } finally {
      setBuildingId(null);
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

      if (json?.sync_warning) {
        setWarning(json.sync_warning);
      }

      await refresh();

      if (created?.package.id === id) {
        setCreated(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke package");
    } finally {
      setRevokingId(null);
    }
  }

  function downloadCommand() {
    if (!installCommand || !created) return;
    const safeGroup = safeFilePart(groupLabel(groups, created.package.group_id));
    downloadText(`Install-Hi5TechAgent-${safeGroup}.ps1`, installCommand);
  }

  const createdInstallerStatus = created?.package.installer_status || "not_requested";
  const createdInstallerReady = createdInstallerStatus === "ready";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-4">
        <section className="hi5-panel p-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[rgb(var(--hi5-accent)/.14)] flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>

            <div>
              <div className="text-lg font-bold">Create Windows agent package</div>
              <p className="text-sm opacity-70 mt-1 leading-relaxed">
                Create a long-lived tenant enrolment package. It remains active until revoked and enrols devices into the selected group.
              </p>
            </div>
          </div>

          {loading ? <div className="text-sm opacity-70">Loading groups and packages…</div> : null}

          <div className="rounded-2xl border hi5-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Target group</div>
                <div className="text-xs opacity-70 mt-1">
                  Devices installed with this package will enrol into this group.
                </div>
              </div>

              <button type="button" className="hi5-btn-ghost text-sm inline-flex items-center gap-2" onClick={refresh}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

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
                placeholder="e.g. Windows Agent - Laptops"
              />
            </label>

            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Install package</div>
              <input className="hi5-input" value="windows-x64" readOnly />
            </label>

            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Package lifetime</div>
              <input className="hi5-input" value="Active until revoked" readOnly />
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

          <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">Provisioned installer</div>
                <div className="text-xs opacity-70 mt-1">
                  GitHub Actions builds a wrapper EXE containing this package’s enrolment details.
                </div>
              </div>
              <StatusPill tone={installerStatusTone(createdInstallerStatus)}>
                {installerStatusLabel(createdInstallerStatus)}
              </StatusPill>
            </div>

            <div className="font-mono text-xs break-all rounded-xl border hi5-border bg-black/5 dark:bg-white/5 p-3">
              {created?.package.installer_filename || previewFileName}
            </div>

            {created?.package.installer_error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
                {created.package.installer_error}
              </div>
            ) : null}

            <div className="text-xs opacity-75 leading-relaxed">
              Once ready, deploy this EXE with only{" "}
              <span className="font-mono">/VERYSILENT /NORESTART /SUPPRESSMSGBOXES</span>.
            </div>
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
              {creating ? "Generating…" : created ? "Generate new package" : "Generate package"}
            </button>

            {created ? (
              <button
                type="button"
                className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
                onClick={buildProvisionedInstaller}
                disabled={buildingId === created.package.id || created.package.installer_status === "building"}
              >
                <PackageCheck size={16} />
                {created.package.installer_status === "building" || buildingId === created.package.id
                  ? "Building…"
                  : created.package.installer_status === "ready"
                    ? "Rebuild provisioned EXE"
                    : "Build provisioned EXE"}
              </button>
            ) : null}

            {created && createdInstallerReady ? (
              <a
                href={buildProvisionedDownloadUrl(created.package.id)}
                className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
              >
                <Download size={16} />
                Download provisioned EXE
              </a>
            ) : created ? (
              <a
                href={buildGenericNamedDownloadUrl(created.package.id)}
                className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
              >
                <Download size={16} />
                Download generic EXE
              </a>
            ) : (
              <a href={AGENT_DOWNLOAD_PATH} download className="hi5-btn-ghost text-sm inline-flex items-center gap-2">
                <Download size={16} />
                Download generic installer
              </a>
            )}

            <Link href="/control/devices" className="hi5-btn-ghost text-sm">
              Back to Devices
            </Link>
          </div>

          <div className="rounded-2xl border hi5-border p-3 text-xs opacity-75 leading-relaxed">
            Generic installer URL:{" "}
            <span className="font-mono break-all">{tenantAwareDownloadUrl}</span>
          </div>
        </section>

        <section className="hi5-panel p-5 space-y-4">
          <SectionTitle
            title="Generated PowerShell deployment command"
            description="Use this until the provisioned EXE is ready, or for script-based deployment tools."
          />

          {created ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border hi5-border p-3">
                  <div className="text-xs opacity-60">Tenant ID</div>
                  <div className="font-mono text-xs mt-1 break-all">{created.package.tenant_id}</div>
                </div>

                <div className="rounded-2xl border hi5-border p-3">
                  <div className="text-xs opacity-60">Group</div>
                  <div className="font-mono text-xs mt-1 break-all">
                    {groupLabel(groups, created.package.group_id)}
                  </div>
                </div>

                <div className="rounded-2xl border hi5-border p-3">
                  <div className="text-xs opacity-60">Package</div>
                  <div className="font-mono text-xs mt-1 break-all">{created.package.id}</div>
                </div>
              </div>

              <CodeBlock value={installCommand} minHeight="min-h-[320px]" />

              <div className="flex flex-wrap gap-2">
                <CopyButton value={installCommand} label="Copy command" className="hi5-btn-primary text-sm" />

                <button type="button" className="hi5-btn-ghost text-sm" onClick={downloadCommand}>
                  Download .ps1
                </button>

                {createdInstallerReady ? (
                  <a
                    href={buildProvisionedDownloadUrl(created.package.id)}
                    className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
                  >
                    <Download size={16} />
                    Provisioned EXE
                  </a>
                ) : null}
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-200 leading-relaxed">
                Save this command now. The enrolment secret is only shown at creation time. Anyone with this command can enrol devices into this tenant/group until the package is revoked.
              </div>
            </>
          ) : (
            <div className="rounded-2xl border hi5-border p-6 text-sm opacity-75">
              No package generated yet. Choose a group and click <span className="font-semibold">Generate package</span>.
            </div>
          )}
        </section>
      </div>

      <section className="hi5-panel p-5 space-y-4">
        <SectionTitle
          title="Provisioned EXE workflow"
          description="Once the build is ready, no tenant/group/token arguments are needed at install time."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <InfoCard icon={<PackageCheck size={19} />} title="Build">
            Click <span className="font-semibold">Build provisioned EXE</span>. GitHub Actions creates a tenant/group-specific wrapper installer.
          </InfoCard>

          <InfoCard icon={<FileCode2 size={19} />} title="Download">
            When status changes to <span className="font-semibold">Ready</span>, download the provisioned EXE from the package row.
          </InfoCard>

          <InfoCard icon={<ShieldCheck size={19} />} title="Deploy">
            Deploy with only{" "}
            <span className="font-mono text-xs">/VERYSILENT /NORESTART /SUPPRESSMSGBOXES</span>.
          </InfoCard>
        </div>
      </section>

      <section className="hi5-panel p-5 space-y-4">
        <SectionTitle
          title="Recommended install options"
          description="Choose the install method that matches your deployment scenario."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <InfoCard icon={<Laptop size={19} />} title="Manual install">
            Download the installer, right-click it, choose <span className="font-semibold">Run as administrator</span>,
            approve UAC, and the agent will install silently. The device should appear online within a few seconds.
          </InfoCard>

          <InfoCard icon={<TerminalSquare size={19} />} title="Silent install">
            Use <span className="font-mono text-xs">{silentCommand}</span> from an elevated prompt, deployment tool,
            or MDM context. If already running as admin/system, no UAC prompt is shown.
          </InfoCard>

          <InfoCard icon={<PackageCheck size={19} />} title="No VC++ prerequisite">
            This Windows agent build is statically linked and should not require the Microsoft Visual C++ Redistributable
            on clean Windows 10/11 devices.
          </InfoCard>
        </div>
      </section>

      <section className="hi5-panel p-5 space-y-4">
        <SectionTitle
          title="MDM / Microsoft Intune deployment"
          description="Use these settings when deploying the Windows agent through Intune or another MDM."
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            <InfoCard icon={<Info size={19} />} title="Intune Win32 app steps">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Download the provisioned Windows agent installer.</li>
                <li>Package it using the Microsoft Win32 Content Prep Tool.</li>
                <li>
                  Upload the generated <span className="font-mono text-xs">.intunewin</span> file to Intune.
                </li>
                <li>
                  Set install behaviour to <span className="font-semibold">System</span>.
                </li>
                <li>Assign to the required device group.</li>
              </ol>
            </InfoCard>

            <InfoCard icon={<ShieldCheck size={19} />} title="Recommended detection rule">
              Use a file detection rule:
              <div className="mt-2 font-mono text-xs break-all">
                Path: C:\Program Files\Hi5Tech\Agent
                <br />
                File: native_vp8_stream.exe
                <br />
                Detection: File exists
              </div>
            </InfoCard>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-bold mb-2">Install command</div>
              <CodeBlock value={silentCommand} />
              <div className="mt-2">
                <CopyButton value={silentCommand} label="Copy install command" />
              </div>
            </div>

            <div>
              <div className="text-sm font-bold mb-2">Uninstall command</div>
              <CodeBlock value={intuneUninstallCommand} />
              <div className="mt-2">
                <CopyButton value={intuneUninstallCommand} label="Copy uninstall command" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hi5-panel p-5 space-y-4">
        <SectionTitle
          title="Install paths and troubleshooting"
          description="Useful details for technicians when validating or troubleshooting installs."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <InfoCard icon={<FileCode2 size={19} />} title="Installed locations">
            <div className="font-mono text-xs break-all">
              Program files:
              <br />
              C:\Program Files\Hi5Tech\Agent
              <br />
              <br />
              Configuration/logs:
              <br />
              C:\ProgramData\Hi5Tech\Agent
              <br />
              C:\ProgramData\Hi5Tech\Agent\Logs\agent.log
            </div>
          </InfoCard>

          <InfoCard icon={<AlertTriangle size={19} />} title="If the device does not appear online">
            <ul className="list-disc pl-4 space-y-1">
              <li>Confirm the installer ran as administrator or system.</li>
              <li>Confirm internet access to the RMM endpoint.</li>
              <li>Confirm the enrolment package has not been revoked.</li>
              <li>Check the agent log in ProgramData.</li>
              <li>Refresh the Devices page after a few seconds.</li>
            </ul>
          </InfoCard>
        </div>
      </section>

      <section className="hi5-panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="text-base font-bold">Active enrolment packages</div>
            <p className="text-sm opacity-70 mt-1 leading-relaxed">
              These packages are valid until revoked. Revoking blocks future installs using that package, but does not remove already enrolled devices.
            </p>
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
                <th className="px-3 py-2">Installer</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {activePackages.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center opacity-70" colSpan={5}>
                    No active enrolment packages yet.
                  </td>
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
                      <div className="flex flex-col gap-2">
                        <StatusPill tone={installerStatusTone(pkg.installer_status)}>
                          {installerStatusLabel(pkg.installer_status)}
                        </StatusPill>

                        {pkg.installer_status === "ready" ? (
                          <a
                            href={buildProvisionedDownloadUrl(pkg.id)}
                            className="hi5-btn-ghost text-xs inline-flex items-center justify-center gap-1"
                          >
                            <Download size={14} /> Download EXE
                          </a>
                        ) : pkg.installer_status === "building" ? (
                          <span className="text-xs opacity-70">GitHub build running…</span>
                        ) : pkg.installer_status === "failed" ? (
                          <span className="text-xs text-red-600 dark:text-red-300">
                            {pkg.installer_error || "Build failed"}
                          </span>
                        ) : (
                          <span className="text-xs opacity-70">
                            Generate a new package to build a provisioned EXE.
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-xs opacity-75">{formatDate(pkg.created_at)}</td>

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
