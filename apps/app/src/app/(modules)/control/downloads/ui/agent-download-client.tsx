"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clipboard, Download, Plus, RotateCcw, ShieldCheck } from "lucide-react";

type EnrollmentPackage = {
  id: string;
  tenant_id: string;
  group_id: string | null;
  policy_id?: string | null;
  name: string;
  status: "active" | "revoked";
  secret_hint?: string | null;
  created_at: string;
};

type CreatePackageResponse = {
  package: EnrollmentPackage;
  bootstrap_secret: string;
};

const AGENT_FILE_NAME = "Hi5TechAgentSetup.exe";
const AGENT_DOWNLOAD_PATH = `/downloads/agent/${AGENT_FILE_NAME}`;
const DEFAULT_RMM_API_BASE_URL = "https://rmm.hi5tech.co.uk";
const DEFAULT_AGENT_WS_BASE_URL = "wss://rmm.hi5tech.co.uk/agent/ws";

function psSingleQuote(value: string) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function createEnrollmentToken(pkg: EnrollmentPackage, bootstrapSecret: string) {
  // Keep this opaque for the agent/control server. Later, the control server can validate
  // this as package_id.bootstrap_secret without changing installer arguments.
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

export default function AgentDownloadClient() {
  const [name, setName] = useState("Windows Agent - Default Group");
  const [groupId, setGroupId] = useState("default");
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_RMM_API_BASE_URL);
  const [agentWsBaseUrl, setAgentWsBaseUrl] = useState(DEFAULT_AGENT_WS_BASE_URL);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatePackageResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

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

  async function createPackage() {
    setCreating(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/admin/enrollment-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Windows Agent Enrollment",
          group_id: groupId.trim() || "default",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || `Failed to create package (${res.status})`);
      }

      setCreated(json as CreatePackageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create enrollment package");
    } finally {
      setCreating(false);
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
    const safeGroup = (created.package.group_id || "default").replace(/[^a-z0-9_-]+/gi, "-");
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
                Create a tenant-scoped enrollment package, choose the target group, then copy the generated PowerShell command.
              </p>
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
              <div className="text-xs opacity-70 mb-1">Group ID</div>
              <input
                className="hi5-input"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="default"
              />
            </label>

            <label className="block text-sm">
              <div className="text-xs opacity-70 mb-1">Install package</div>
              <input className="hi5-input" value="windows-x64" readOnly />
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="hi5-btn-primary text-sm inline-flex items-center gap-2"
              onClick={createPackage}
              disabled={creating}
            >
              {creating ? <RotateCcw size={16} className="animate-spin" /> : <Plus size={16} />}
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold">PowerShell install command</div>
              <p className="text-sm opacity-70 mt-1">
                Run this from the target Windows device. It downloads the installer, asks for admin, installs the service, and enrolls into the selected group.
              </p>
            </div>
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
                  <div className="font-mono text-xs mt-1 break-all">{created.package.group_id || "default"}</div>
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
                Save this command now. The enrollment secret is only shown at creation time. If you lose it, generate a new package/command.
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
        <div className="text-base font-bold">How this enrollment works</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-2xl border hi5-border p-3">
            <div className="font-semibold">1. Package</div>
            <p className="opacity-70 mt-1">A tenant-scoped package is created with your selected group ID.</p>
          </div>
          <div className="rounded-2xl border hi5-border p-3">
            <div className="font-semibold">2. Download</div>
            <p className="opacity-70 mt-1">The target device downloads the generic EXE from the tenant domain.</p>
          </div>
          <div className="rounded-2xl border hi5-border p-3">
            <div className="font-semibold">3. Install</div>
            <p className="opacity-70 mt-1">The installer writes config.ini and starts the Windows service as admin.</p>
          </div>
          <div className="rounded-2xl border hi5-border p-3">
            <div className="font-semibold">4. Enroll</div>
            <p className="opacity-70 mt-1">The agent sends tenant, group, package, and enrollment token to the RMM API.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
