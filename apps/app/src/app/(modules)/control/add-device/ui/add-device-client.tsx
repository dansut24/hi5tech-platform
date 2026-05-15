"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Clipboard,
  Download,
  Laptop,
  Monitor,
  PackageCheck,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  TerminalSquare,
  Workflow,
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

type PlatformKey = "windows" | "macos" | "linux";
type DeviceTypeKey = "laptop" | "desktop" | "server" | "other";

const DEFAULT_RMM_API_BASE_URL = "https://rmm.hi5tech.co.uk";
const DEFAULT_AGENT_WS_BASE_URL = "wss://rmm.hi5tech.co.uk/agent/ws";

const DEVICE_TYPES: Array<{
  key: DeviceTypeKey;
  label: string;
  description: string;
  icon: ReactNode;
  preferredGroupName: string;
}> = [
  {
    key: "laptop",
    label: "Laptop",
    description: "Portable Windows devices, hybrid users and field staff.",
    icon: <Laptop size={20} />,
    preferredGroupName: "Laptops",
  },
  {
    key: "desktop",
    label: "Desktop",
    description: "Office desktops, shared workstations and fixed devices.",
    icon: <Monitor size={20} />,
    preferredGroupName: "Desktops",
  },
  {
    key: "server",
    label: "Server",
    description: "Windows servers and always-on infrastructure devices.",
    icon: <Server size={20} />,
    preferredGroupName: "Servers",
  },
  {
    key: "other",
    label: "Other / VM",
    description: "Virtual machines, test devices or anything not categorised.",
    icon: <Workflow size={20} />,
    preferredGroupName: "Default",
  },
];

function psSingleQuote(value: string) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function createEnrollmentToken(pkg: EnrollmentPackage, bootstrapSecret: string) {
  return `${pkg.id}.${bootstrapSecret}`;
}

function groupLabel(groups: DeviceGroup[], groupId: string | null | undefined) {
  if (!groupId || groupId === "default") return "Default";
  const group = groups.find((g) => g.id === groupId || g.slug === groupId);
  return group ? group.name : groupId;
}

function buildProvisionedDownloadUrl(packageId: string) {
  return `/api/admin/enrollment-packages/download/exe?id=${encodeURIComponent(packageId)}`;
}

function buildSilentCommand() {
  return `Hi5TechAgentSetup.exe /VERYSILENT /NORESTART /SUPPRESSMSGBOXES`;
}

function buildUninstallCommand() {
  return `"C:\\Program Files\\Hi5Tech\\Agent\\native_vp8_stream.exe" --uninstall-service`;
}

function buildLegacyInstallCommand(input: {
  origin: string;
  tenantId: string;
  groupId: string;
  packageId: string;
  enrollmentToken: string;
  apiBaseUrl: string;
  agentWsBaseUrl: string;
}) {
  const downloadUrl = `${input.origin.replace(/\/+$/, "")}/downloads/Hi5TechAgentSetup.exe`;

  return [
    `$Installer = Join-Path $env:TEMP 'Hi5TechAgentSetup.exe'`,
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
  return "Not prepared";
}

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="overflow-auto rounded-2xl border hi5-border bg-black/90 p-4 text-xs text-white whitespace-pre-wrap break-words">
      {value}
    </pre>
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

export default function AddDeviceClient() {
  const [platform, setPlatform] = useState<PlatformKey>("windows");
  const [deviceType, setDeviceType] = useState<DeviceTypeKey>("laptop");
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [packages, setPackages] = useState<EnrollmentPackage[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("default");

  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [created, setCreated] = useState<CreatePackageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const selectedType = DEVICE_TYPES.find((item) => item.key === deviceType) ?? DEVICE_TYPES[0];
  const selectedGroup = groups.find((group) => group.id === selectedGroupId || group.slug === selectedGroupId);

  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.status === "active"),
    [packages]
  );

  const selectedPackage = useMemo(() => {
    const groupId = selectedGroupId || "default";

    const matching = activePackages
      .filter((pkg) => (pkg.group_id || "default") === groupId)
      .sort((a, b) => {
        const aReady = a.installer_status === "ready" ? 1 : 0;
        const bReady = b.installer_status === "ready" ? 1 : 0;
        if (aReady !== bReady) return bReady - aReady;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    return matching[0] ?? null;
  }, [activePackages, selectedGroupId]);

  const effectivePackage = created?.package ?? selectedPackage;
  const status = effectivePackage?.installer_status || "not_requested";
  const isReady = status === "ready";
  const isBuilding = status === "building";

  const silentCommand = buildSilentCommand();
  const uninstallCommand = buildUninstallCommand();

  const legacyCommand = useMemo(() => {
    if (!created) return "";

    return buildLegacyInstallCommand({
      origin,
      tenantId: created.package.tenant_id,
      groupId: created.package.group_id || "default",
      packageId: created.package.id,
      enrollmentToken: createEnrollmentToken(created.package, created.bootstrap_secret),
      apiBaseUrl: DEFAULT_RMM_API_BASE_URL,
      agentWsBaseUrl: DEFAULT_AGENT_WS_BASE_URL,
    });
  }, [created, origin]);

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
      if (!packagesRes.ok) throw new Error(packagesJson?.error || "Failed to load enrolment packages");

      const loadedGroups: DeviceGroup[] = groupsJson?.groups ?? [];
      const loadedPackages: EnrollmentPackage[] = packagesJson?.packages ?? [];

      setGroups(loadedGroups);
      setPackages(loadedPackages);

      if (created) {
        const updated = loadedPackages.find((pkg) => pkg.id === created.package.id);
        if (updated) {
          setCreated({ ...created, package: updated });
        }
      }

      if (!loadedGroups.some((g) => g.id === selectedGroupId || g.slug === selectedGroupId)) {
        const preferred = loadedGroups.find(
          (g) => g.name.toLowerCase() === selectedType.preferredGroupName.toLowerCase()
        );

        if (preferred) {
          setSelectedGroupId(preferred.id);
        } else if (loadedGroups[0]) {
          setSelectedGroupId(loadedGroups[0].id);
        } else {
          setSelectedGroupId("default");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Add Device data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const preferred = groups.find(
      (group) => group.name.toLowerCase() === selectedType.preferredGroupName.toLowerCase()
    );

    if (preferred) {
      setSelectedGroupId(preferred.id);
      setCreated(null);
    } else if (selectedType.preferredGroupName === "Default") {
      setSelectedGroupId("default");
      setCreated(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceType]);

  useEffect(() => {
    if (!isBuilding) return;

    const timer = window.setInterval(() => {
      refresh();
    }, 8000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuilding, created?.package.id]);

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
    const groupName = selectedGroup?.name || groupLabel(groups, selectedGroupId);
    const packageName = `Windows Agent - ${selectedType.label} - ${groupName}`;

    const res = await fetch("/api/admin/enrollment-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: packageName,
        group_id: selectedGroupId || "default",
        package_type: "windows-x64",
        install_source: `add-device-${selectedType.key}`,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || `Failed to create package (${res.status})`);

    return json as CreatePackageResponse;
  }

  async function buildPackage(pkgResponse: CreatePackageResponse) {
    const res = await fetch("/api/admin/enrollment-packages/build-installer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_id: pkgResponse.package.id,
        bootstrap_secret: pkgResponse.bootstrap_secret,
        api_base_url: DEFAULT_RMM_API_BASE_URL,
        agent_ws_base_url: DEFAULT_AGENT_WS_BASE_URL,
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || `Failed to start installer build (${res.status})`);

    if (json?.package) {
      return { ...pkgResponse, package: json.package as EnrollmentPackage };
    }

    return pkgResponse;
  }

  async function prepareInstaller() {
    setPreparing(true);
    setError(null);
    setWarning(null);

    try {
      let response = created;

      if (!response || (response.package.group_id || "default") !== selectedGroupId) {
        response = await createPackage();
      }

      if (response.sync_warning) {
        setWarning(response.sync_warning);
      }

      const built = await buildPackage(response);
      setCreated(built);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to prepare installer");
    } finally {
      setPreparing(false);
    }
  }

  const canDownloadProvisioned = Boolean(effectivePackage?.id && isReady);
  const downloadUrl = effectivePackage?.id ? buildProvisionedDownloadUrl(effectivePackage.id) : "";

  return (
    <div className="space-y-6">
      <section className="hi5-panel p-5 space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-5">
          <div className="space-y-5">
            <div>
              <div className="text-lg font-bold">1. Choose platform</div>
              <p className="text-sm opacity-70 mt-1">
                Windows is available now. macOS and Linux can be added later using the same workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPlatform("windows")}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  platform === "windows"
                    ? "border-[rgb(var(--hi5-accent)/.5)] bg-[rgb(var(--hi5-accent)/.12)]"
                    : "hi5-border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10",
                ].join(" ")}
              >
                <div className="text-sm font-bold">Windows</div>
                <div className="text-xs opacity-70 mt-1">Available</div>
              </button>

              <button
                type="button"
                disabled
                className="rounded-2xl border hi5-border p-4 text-left opacity-50 bg-black/5 dark:bg-white/5"
              >
                <div className="text-sm font-bold">macOS</div>
                <div className="text-xs opacity-70 mt-1">Coming later</div>
              </button>

              <button
                type="button"
                disabled
                className="rounded-2xl border hi5-border p-4 text-left opacity-50 bg-black/5 dark:bg-white/5"
              >
                <div className="text-sm font-bold">Linux</div>
                <div className="text-xs opacity-70 mt-1">Coming later</div>
              </button>
            </div>

            <div>
              <div className="text-lg font-bold">2. Choose device type</div>
              <p className="text-sm opacity-70 mt-1">
                This helps select the right default group and keeps onboarding simple.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEVICE_TYPES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDeviceType(item.key)}
                  className={[
                    "rounded-2xl border p-4 text-left transition",
                    deviceType === item.key
                      ? "border-[rgb(var(--hi5-accent)/.5)] bg-[rgb(var(--hi5-accent)/.12)]"
                      : "hi5-border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <div className="text-sm font-bold">{item.label}</div>
                  </div>
                  <div className="text-xs opacity-70 mt-2 leading-relaxed">{item.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border hi5-border bg-black/5 dark:bg-white/5 p-4 space-y-4">
            <div>
              <div className="text-lg font-bold">3. Target group</div>
              <p className="text-sm opacity-70 mt-1">
                The installer will enrol the device into this group. Devices can be moved later from the Devices page.
              </p>
            </div>

            <select
              className="hi5-input"
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setCreated(null);
              }}
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
                placeholder="Create new group, e.g. Finance Laptops"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />

              <button
                type="button"
                className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
                onClick={createGroup}
                disabled={creatingGroup || !newGroupName.trim()}
              >
                <Plus size={15} />
                {creatingGroup ? "Creating…" : "Create group"}
              </button>
            </div>

            <div className="rounded-2xl border hi5-border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold">Installer status</div>
                  <div className="text-xs opacity-70 mt-1">
                    {effectivePackage?.installer_filename || "No provisioned installer selected yet."}
                  </div>
                </div>

                <StatusPill tone={installerStatusTone(status)}>
                  {installerStatusLabel(status)}
                </StatusPill>
              </div>

              {effectivePackage?.installer_error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-200">
                  {effectivePackage.installer_error}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              {warning ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-200">
                  Control server sync warning: {warning}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {canDownloadProvisioned ? (
                  <a href={downloadUrl} className="hi5-btn-primary text-sm inline-flex items-center gap-2">
                    <Download size={16} />
                    Download Windows Agent
                  </a>
                ) : (
                  <button
                    type="button"
                    className="hi5-btn-primary text-sm inline-flex items-center gap-2"
                    onClick={prepareInstaller}
                    disabled={preparing || isBuilding}
                  >
                    {preparing || isBuilding ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <PackageCheck size={16} />
                    )}
                    {isBuilding ? "Preparing installer…" : preparing ? "Starting build…" : "Prepare installer"}
                  </button>
                )}

                <button
                  type="button"
                  className="hi5-btn-ghost text-sm inline-flex items-center gap-2"
                  onClick={refresh}
                  disabled={loading}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>

                <Link href="/control/downloads" className="hi5-btn-ghost text-sm">
                  Advanced downloads
                </Link>
              </div>

              <div className="text-xs opacity-70 leading-relaxed">
                If the installer is not ready, Hi5Tech will create a new package and start the GitHub build.
                This usually takes under a minute.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="hi5-panel p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[rgb(var(--hi5-accent)/.14)] flex items-center justify-center shrink-0">
              <TerminalSquare size={22} />
            </div>

            <div>
              <div className="text-lg font-bold">Silent install command</div>
              <p className="text-sm opacity-70 mt-1">
                Use this for the provisioned EXE once downloaded.
              </p>
            </div>
          </div>

          <CodeBlock value={silentCommand} />

          <div className="flex flex-wrap gap-2">
            <CopyButton value={silentCommand} label="Copy install command" className="hi5-btn-primary text-sm" />
          </div>
        </div>

        <div className="hi5-panel p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[rgb(var(--hi5-accent)/.14)] flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>

            <div>
              <div className="text-lg font-bold">MDM / Intune guidance</div>
              <p className="text-sm opacity-70 mt-1">
                Package the downloaded provisioned EXE as a Win32 app and deploy as System.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm opacity-80 leading-relaxed">
            <ol className="list-decimal pl-4 space-y-1">
              <li>Download the provisioned Windows Agent EXE.</li>
              <li>Package it using Microsoft Win32 Content Prep Tool.</li>
              <li>Use install behaviour: <span className="font-semibold">System</span>.</li>
              <li>Use the silent install command shown on this page.</li>
              <li>Use file detection for <span className="font-mono text-xs">C:\Program Files\Hi5Tech\Agent\native_vp8_stream.exe</span>.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <InfoCard icon={<PackageCheck size={19} />} title="Provisioned EXE">
          The downloaded installer already contains the tenant, group and enrolment package details.
          No long token command is needed once it is ready.
        </InfoCard>

        <InfoCard icon={<ShieldCheck size={19} />} title="Stable install path">
          The agent installs to <span className="font-mono text-xs">C:\Program Files\Hi5Tech\Agent</span>.
          Tenant-specific data stays in ProgramData.
        </InfoCard>

        <InfoCard icon={<AlertTriangle size={19} />} title="Immutable packages">
          Installers should not be edited after creation. For a different group or rollout, create a new installer and revoke the old one if required.
        </InfoCard>
      </section>

      {created && legacyCommand ? (
        <section className="hi5-panel p-5 space-y-4">
          <div>
            <div className="text-lg font-bold">Fallback PowerShell command</div>
            <p className="text-sm opacity-70 mt-1">
              Useful while the provisioned EXE is building, or if you need to test the generic installer flow.
            </p>
          </div>

          <CodeBlock value={legacyCommand} />

          <CopyButton value={legacyCommand} label="Copy fallback command" />
        </section>
      ) : null}

      <section className="hi5-panel p-5 space-y-4">
        <div className="text-lg font-bold">Uninstall command</div>
        <p className="text-sm opacity-70">
          Use this for Intune/RMM uninstall actions.
        </p>

        <CodeBlock value={uninstallCommand} />

        <CopyButton value={uninstallCommand} label="Copy uninstall command" />
      </section>
    </div>
  );
}
