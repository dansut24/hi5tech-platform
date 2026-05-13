import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import TerminalPanel from "../../[id]/ui/terminal-panel";
import FileBrowserPanel from "../../[id]/ui/file-browser-panel";
import ServicesPanel from "../../[id]/ui/services-panel";
import ActivityPanel from "../../[id]/ui/activity-panel";
import RemotePanel from "../../[id]/ui/remote-panel";
import { getActiveTenantId } from "@/lib/tenant";
import { getTenantFeatures } from "@/lib/entitlements";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const RMM_API_BASE =
  process.env.NEXT_PUBLIC_RMM_API_BASE?.replace(/\/+$/, "") ||
  "https://rmm.hi5tech.co.uk";

type JsonRecord = Record<string, any>;

type DeviceRecord = {
  device_id: string;
  tenant_id?: string | null;
  group_id?: string | null;
  hostname?: string | null;
  os?: string | null;
  arch?: string | null;
  agent_version?: string | null;
  online?: boolean | null;
  last_seen_at?: string | null;
  updated_at?: string | null;
};

type DeviceInventory = {
  summary?: JsonRecord | null;
  hardware?: JsonRecord | null;
  os?: JsonRecord | null;
  cpu?: JsonRecord | null;
  memory?: JsonRecord | null;
  storage?: any[] | JsonRecord | null;
  security?: JsonRecord | null;
  network?: JsonRecord | null;
  sessions?: JsonRecord | null;
  displays?: any[] | JsonRecord | null;
  battery?: JsonRecord | null;
  agent?: JsonRecord | null;
  health?: JsonRecord | null;
  software_summary?: JsonRecord | null;
  services_summary?: JsonRecord | null;
  events_summary?: JsonRecord | null;
  collected_at?: string | null;
};

type ActiveSession = {
  session_id?: string;
  device_id?: string;
  mode?: "console" | "backstage" | string;
  connected_at?: string;
  created_at?: string;
  expires_at?: string;
};

type ActiveSessionResponse = {
  active?: boolean;
  sessions?: ActiveSession[];
  error?: string;
};

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function boolText(value: any) {
  if (value === true) return "Enabled";
  if (value === false) return "Disabled";
  return "—";
}

function formatBytes(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = n;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }

  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function formatPercent(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n)}%`;
}

function formatDate(value: any) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.drives)) return value.drives;
    if (Array.isArray(value.adapters)) return value.adapters;
    if (Array.isArray(value.displays)) return value.displays;
  }

  return [];
}

function firstValue(obj: JsonRecord | null | undefined, keys: string[], fallback: any = undefined) {
  if (!obj) return fallback;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  return fallback;
}

function statusClass(status: "good" | "warning" | "bad" | "neutral") {
  if (status === "good") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  }

  if (status === "warning") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200";
  }

  if (status === "bad") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-200";
  }

  return "hi5-border bg-black/5 dark:bg-white/5";
}

function InfoCard({
  label,
  value,
  sub,
  status = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  status?: "good" | "warning" | "bad" | "neutral";
}) {
  return (
    <div className={["rounded-2xl border p-4", statusClass(status)].join(" ")}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-extrabold mt-1 break-words">{value}</div>
      {sub ? <div className="text-xs opacity-75 mt-1">{sub}</div> : null}
    </div>
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

function Section({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section className="hi5-card p-4 space-y-3">
      <div>
        <div className="text-sm font-bold">{title}</div>
        {note ? <div className="text-xs opacity-70 mt-1">{note}</div> : null}
      </div>
      {children}
    </section>
  );
}

function TabLink({
  href,
  active,
  label,
  locked,
}: {
  href: string;
  active: boolean;
  label: string;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <span className="rounded-2xl px-3 py-2 text-sm border hi5-border opacity-50 cursor-not-allowed">
        {label} 🔒
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={[
        "rounded-2xl px-3 py-2 text-sm border hi5-border transition",
        active
          ? "bg-[rgba(var(--hi5-accent),0.10)] border-[rgba(var(--hi5-accent),0.28)]"
          : "hover:bg-black/5 dark:hover:bg-white/5",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function LockedButton({ label }: { label: string }) {
  return (
    <button className="hi5-btn-ghost text-sm opacity-60" type="button" disabled title="Premium feature">
      {label} 🔒
    </button>
  );
}

async function loadDevice(tenantId: string, deviceId: string) {
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("devices")
    .select("device_id, tenant_id, group_id, hostname, os, arch, agent_version, online, last_seen_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();

  return (data as DeviceRecord | null) ?? null;
}

async function loadInventory(tenantId: string, deviceId: string) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("device_inventory")
    .select(
      "summary, hardware, os, cpu, memory, storage, security, network, sessions, displays, battery, agent, health, software_summary, services_summary, events_summary, collected_at"
    )
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    console.error("[control/device] inventory load failed", error.message);
    return null;
  }

  return (data as DeviceInventory | null) ?? null;
}

async function loadActiveSessions(deviceId: string): Promise<ActiveSessionResponse> {
  try {
    const res = await fetch(
      `${RMM_API_BASE}/api/remote-sessions/active?device_id=${encodeURIComponent(deviceId)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        active: false,
        sessions: [],
        error: json?.error || `HTTP ${res.status}`,
      };
    }

    return json ?? { active: false, sessions: [] };
  } catch (err) {
    return {
      active: false,
      sessions: [],
      error: err instanceof Error ? err.message : "Remote session lookup failed",
    };
  }
}

function Overview({
  device,
  inventory,
  activeSessions,
}: {
  device: DeviceRecord | null;
  inventory: DeviceInventory | null;
  activeSessions: ActiveSessionResponse;
}) {
  const summary = inventory?.summary ?? {};
  const hardware = inventory?.hardware ?? {};
  const osInfo = inventory?.os ?? {};
  const cpu = inventory?.cpu ?? {};
  const memory = inventory?.memory ?? {};
  const security = inventory?.security ?? {};
  const network = inventory?.network ?? {};
  const sessions = inventory?.sessions ?? {};
  const battery = inventory?.battery ?? {};
  const agent = inventory?.agent ?? {};
  const health = inventory?.health ?? {};
  const softwareSummary = inventory?.software_summary ?? {};
  const servicesSummary = inventory?.services_summary ?? {};
  const eventsSummary = inventory?.events_summary ?? {};
  const storage = asArray(inventory?.storage);
  const displays = asArray(inventory?.displays);

  const remoteActive = activeSessions.active === true && (activeSessions.sessions?.length ?? 0) > 0;
  const activeModes = Array.from(new Set((activeSessions.sessions ?? []).map((s) => s.mode || "console")));

  const rebootRequired = firstValue(
    health,
    ["reboot_required", "pending_reboot"],
    firstValue(summary, ["reboot_required", "pending_reboot"])
  );

  const diskWarning = firstValue(health, ["disk_warning", "low_disk_space"]);
  const defenderOk = firstValue(security, ["defender_enabled", "defender_realtime_enabled", "antivirus_enabled"]);
  const bitlocker = firstValue(security, ["bitlocker_status", "bitlocker", "bitlocker_enabled"]);
  const tpmEnabled = firstValue(security, ["tpm_enabled", "tpmActivated", "tpm_activated"]);
  const secureBoot = firstValue(security, ["secure_boot_enabled", "secureBoot"]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
        <InfoCard
          label="Remote session"
          value={remoteActive ? "Active" : "Inactive"}
          sub={
            remoteActive
              ? activeModes.map((m) => (m === "backstage" ? "Background" : "Console")).join(" + ")
              : activeSessions.error
                ? "Unable to check"
                : "No viewer connected"
          }
          status={remoteActive ? "good" : "neutral"}
        />

        <InfoCard
          label="CPU"
          value={formatPercent(firstValue(cpu, ["usage_percent", "usage", "load_percent"]))}
          sub={text(firstValue(cpu, ["name", "model", "brand"], "Waiting for inventory"))}
        />

        <InfoCard
          label="Memory"
          value={formatPercent(firstValue(memory, ["usage_percent", "used_percent"]))}
          sub={`${formatBytes(firstValue(memory, ["used_bytes", "used"]))} used / ${formatBytes(firstValue(memory, ["total_bytes", "total"]))} total`}
        />

        <InfoCard
          label="Disk"
          value={diskWarning === true ? "Warning" : text(firstValue(health, ["disk_status"], "—"))}
          sub={
            storage[0]
              ? `${text(storage[0].letter ?? storage[0].mount ?? storage[0].name)} ${formatPercent(storage[0].used_percent)}`
              : "Waiting for inventory"
          }
          status={diskWarning === true ? "warning" : "neutral"}
        />

        <InfoCard
          label="Security"
          value={defenderOk === false || tpmEnabled === false ? "Attention" : defenderOk === true ? "Good" : "—"}
          sub={`TPM ${boolText(tpmEnabled)} · Secure Boot ${boolText(secureBoot)}`}
          status={defenderOk === false || tpmEnabled === false ? "warning" : defenderOk === true ? "good" : "neutral"}
        />

        <InfoCard
          label="Reboot"
          value={rebootRequired === true ? "Required" : rebootRequired === false ? "No" : "—"}
          sub="Pending reboot state"
          status={rebootRequired === true ? "warning" : rebootRequired === false ? "good" : "neutral"}
        />
      </div>

      <div className="hi5-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="text-sm font-bold">Technician summary</div>
            <div className="text-sm opacity-75 mt-1">
              {remoteActive ? "A remote viewer is currently connected. " : "No active remote viewer is currently connected. "}
              {inventory?.collected_at
                ? `Inventory last collected ${formatDate(inventory.collected_at)}.`
                : "Detailed inventory has not been reported by the agent yet."}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className={["rounded-full border px-3 py-1", device?.online ? statusClass("good") : statusClass("bad")].join(" ")}>
              {device?.online ? "Online" : "Offline"}
            </span>
            <span className={["rounded-full border px-3 py-1", remoteActive ? statusClass("good") : statusClass("neutral")].join(" ")}>
              {remoteActive ? "Remote active" : "Remote idle"}
            </span>
            <span className={["rounded-full border px-3 py-1", rebootRequired === true ? statusClass("warning") : statusClass("neutral")].join(" ")}>
              {rebootRequired === true ? "Reboot required" : "No reboot flag"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section title="System" note="Core OS and device identity.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Hostname" value={firstValue(summary, ["hostname"], device?.hostname)} />
            <Field label="Operating system" value={firstValue(osInfo, ["name", "caption"], device?.os)} />
            <Field label="OS version" value={firstValue(osInfo, ["version", "display_version"])} />
            <Field label="OS build" value={firstValue(osInfo, ["build", "build_number"])} />
            <Field label="Architecture" value={firstValue(osInfo, ["architecture", "arch"], device?.arch)} />
            <Field label="Last boot" value={formatDate(firstValue(osInfo, ["last_boot", "last_boot_time"]))} />
            <Field label="Uptime" value={firstValue(osInfo, ["uptime", "uptime_text"])} />
            <Field label="Timezone" value={firstValue(osInfo, ["timezone"])} />
          </div>
        </Section>

        <Section title="Hardware" note="Make, model, BIOS and warranty-ready identity.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Manufacturer" value={firstValue(hardware, ["manufacturer", "vendor"])} />
            <Field label="Model" value={firstValue(hardware, ["model", "product"])} />
            <Field label="Serial number" value={firstValue(hardware, ["serial", "serial_number"])} />
            <Field label="Asset tag" value={firstValue(hardware, ["asset_tag", "asset"])} />
            <Field label="BIOS vendor" value={firstValue(hardware, ["bios_vendor"])} />
            <Field label="BIOS version" value={firstValue(hardware, ["bios_version"])} />
            <Field label="BIOS date" value={firstValue(hardware, ["bios_date", "bios_release_date"])} />
            <Field label="Device UUID" value={firstValue(hardware, ["uuid", "device_uuid"])} />
          </div>
        </Section>

        <Section title="CPU and memory" note="Performance snapshot and installed resource totals.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="CPU" value={firstValue(cpu, ["name", "model", "brand"])} />
            <Field label="CPU usage" value={formatPercent(firstValue(cpu, ["usage_percent", "usage"]))} />
            <Field label="Cores" value={firstValue(cpu, ["cores", "physical_cores"])} />
            <Field label="Logical processors" value={firstValue(cpu, ["logical_processors", "threads"])} />
            <Field label="Virtualisation" value={boolText(firstValue(cpu, ["virtualization_enabled", "virtualisation_enabled"]))} />
            <Field label="Max clock" value={firstValue(cpu, ["max_clock_mhz", "max_clock_speed"])} />
            <Field label="Total RAM" value={formatBytes(firstValue(memory, ["total_bytes", "total"]))} />
            <Field label="Available RAM" value={formatBytes(firstValue(memory, ["available_bytes", "available", "free_bytes"]))} />
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section title="Security posture" note="Core Windows security and compliance checks.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="TPM present" value={boolText(firstValue(security, ["tpm_present", "tpmPresent"]))} />
            <Field label="TPM enabled" value={boolText(tpmEnabled)} />
            <Field label="TPM version" value={firstValue(security, ["tpm_version", "tpm_spec_version"])} />
            <Field label="Secure Boot" value={boolText(secureBoot)} />
            <Field label="BitLocker" value={typeof bitlocker === "boolean" ? boolText(bitlocker) : bitlocker} />
            <Field label="Defender real-time" value={boolText(defenderOk)} />
            <Field label="Firewall" value={boolText(firstValue(security, ["firewall_enabled", "firewall"]))} />
            <Field label="Local admins" value={firstValue(security, ["local_admin_count", "local_admins_count"])} />
          </div>
        </Section>

        <Section title="Network" note="Primary adapter and domain/workgroup details.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Primary IPv4" value={firstValue(network, ["primary_ipv4", "ipv4", "ip"])} />
            <Field label="Public IP" value={firstValue(network, ["public_ip", "wan_ip"])} />
            <Field label="MAC address" value={firstValue(network, ["mac", "mac_address"])} />
            <Field label="Adapter" value={firstValue(network, ["adapter", "adapter_name"])} />
            <Field label="Connection" value={firstValue(network, ["connection_type", "type"])} />
            <Field label="Domain/workgroup" value={firstValue(network, ["domain", "workgroup"])} />
            <Field label="Gateway" value={firstValue(network, ["gateway", "default_gateway"])} />
            <Field label="DNS" value={firstValue(network, ["dns", "dns_servers"])} />
          </div>
        </Section>

        <Section title="User sessions" note="Useful before starting remote control.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Current user" value={firstValue(sessions, ["current_user", "active_user"])} />
            <Field label="Console user" value={firstValue(sessions, ["console_user"])} />
            <Field label="Locked" value={boolText(firstValue(sessions, ["locked", "is_locked"]))} />
            <Field label="Idle time" value={firstValue(sessions, ["idle_time", "idle"])} />
            <Field label="RDP sessions" value={firstValue(sessions, ["rdp_session_count", "rdp_sessions"])} />
            <Field label="Last logged-in user" value={firstValue(sessions, ["last_user", "last_logged_in_user"])} />
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section title="Agent health" note="Agent service and inventory status.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Agent version" value={firstValue(agent, ["version"], device?.agent_version)} />
            <Field label="Service" value={firstValue(agent, ["service_status", "status"])} />
            <Field label="Install path" value={firstValue(agent, ["install_path"])} />
            <Field label="WebSocket" value={firstValue(agent, ["websocket_status", "ws_status"])} />
            <Field label="Last heartbeat" value={formatDate(firstValue(agent, ["last_heartbeat"], device?.last_seen_at))} />
            <Field label="Inventory sync" value={formatDate(inventory?.collected_at)} />
          </div>
        </Section>

        <Section title="Battery / laptop" note="Helpful for laptop support.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Battery present" value={boolText(firstValue(battery, ["present", "battery_present"]))} />
            <Field label="Charge" value={formatPercent(firstValue(battery, ["charge_percent", "percent"]))} />
            <Field label="Health" value={firstValue(battery, ["health", "health_percent"])} />
            <Field label="Charging" value={boolText(firstValue(battery, ["charging", "is_charging"]))} />
          </div>
        </Section>

        <Section title="Recent issues" note="High-value troubleshooting signals.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Update failures" value={firstValue(eventsSummary, ["windows_update_failures", "update_failures"])} />
            <Field label="Recent crashes" value={firstValue(eventsSummary, ["recent_crashes", "application_crashes"])} />
            <Field label="Unexpected shutdowns" value={firstValue(eventsSummary, ["unexpected_shutdowns"])} />
            <Field label="Service failures" value={firstValue(eventsSummary, ["service_failures"])} />
          </div>
        </Section>
      </div>

      <Section title="Storage" note="Disk capacity and protection state.">
        {storage.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {storage.map((drive, index) => (
              <div key={index} className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold">{text(drive.letter ?? drive.mount ?? drive.name, `Drive ${index + 1}`)}</div>
                  <div className="text-xs opacity-70">{text(drive.file_system ?? drive.fs)}</div>
                </div>
                <div className="text-2xl font-extrabold mt-2">{formatPercent(drive.used_percent)}</div>
                <div className="text-xs opacity-75 mt-1">
                  {formatBytes(drive.free_bytes ?? drive.free)} free / {formatBytes(drive.total_bytes ?? drive.total)} total
                </div>
                <div className="text-xs opacity-75 mt-1">
                  BitLocker {text(drive.bitlocker_status ?? drive.bitlocker)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm opacity-75">No storage inventory reported yet.</div>
        )}
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Displays / GPU" note="Useful for DPI, black screen and multi-monitor support.">
          {displays.length ? (
            <div className="space-y-2">
              {displays.map((display, index) => (
                <div key={index} className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-3 text-sm">
                  <div className="font-semibold">{text(display.name, `Display ${index + 1}`)}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {text(display.width)}×{text(display.height)} · Scale{" "}
                    {formatPercent(display.scale_percent ?? display.scale)} ·{" "}
                    {display.primary ? "Primary" : "Secondary"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Monitor count" value={firstValue(summary, ["monitor_count"])} />
              <Field label="GPU" value={firstValue(hardware, ["gpu", "gpu_name"])} />
              <Field label="GPU driver" value={firstValue(hardware, ["gpu_driver", "gpu_driver_version"])} />
            </div>
          )}
        </Section>

        <Section title="Software and services summary" note="Detailed software/services tabs can be added later.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Installed apps" value={firstValue(softwareSummary, ["installed_count", "apps_count"])} />
            <Field label="Recently installed" value={firstValue(softwareSummary, ["recently_installed_count"])} />
            <Field label="Running services" value={firstValue(servicesSummary, ["running_count"])} />
            <Field label="Stopped critical services" value={firstValue(servicesSummary, ["stopped_critical_count"])} />
          </div>
        </Section>
      </div>

      <Section title="Active remote sessions" note="Shows whether a viewer is connected in Console or Background Mode.">
        {remoteActive ? (
          <div className="space-y-2">
            {(activeSessions.sessions ?? []).map((session) => (
              <div
                key={session.session_id ?? `${session.mode}-${session.connected_at}`}
                className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3"
              >
                <div className="text-sm font-bold">
                  {session.mode === "backstage" ? "Background Mode" : "Console Remote Control"}
                </div>
                <div className="text-xs opacity-75 mt-1">
                  Connected {formatDate(session.connected_at ?? session.created_at)} · Session {text(session.session_id)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm opacity-75">
            No active remote sessions reported for this device.
            {activeSessions.error ? (
              <span className="block mt-1 text-xs opacity-60">
                Session status endpoint is not available yet: {activeSessions.error}
              </span>
            ) : null}
          </div>
        )}
      </Section>
    </div>
  );
}

export default async function DevicePage({
  params,
  searchParams,
}: {
  params: Promise<{ deviceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { deviceId } = await params;
  const sp = await searchParams;
  const tab = String(sp.tab || "overview");

  const tenantId = await getActiveTenantId();
  const features = await getTenantFeatures(tenantId);

  const canRemote = features.remote_control === true;
  const canTerminal = features.remote_terminal === true;
  const canFiles = features.remote_files === true;

  if (tab === "remote" && !canRemote) {
    redirect(`/control/devices/${encodeURIComponent(deviceId)}?tab=overview`);
  }

  if (tab === "terminal" && !canTerminal) {
    redirect(`/control/devices/${encodeURIComponent(deviceId)}?tab=overview`);
  }

  if (tab === "files" && !canFiles) {
    redirect(`/control/devices/${encodeURIComponent(deviceId)}?tab=overview`);
  }

  const [device, inventory, activeSessions] = await Promise.all([
    loadDevice(tenantId, deviceId),
    loadInventory(tenantId, deviceId),
    loadActiveSessions(deviceId),
  ]);

  const displayName = device?.hostname || deviceId;
  const remoteActive = activeSessions.active === true && (activeSessions.sessions?.length ?? 0) > 0;
  const remoteLabel = remoteActive
    ? (activeSessions.sessions ?? []).some((session) => session.mode === "backstage")
      ? "Background active"
      : "Remote active"
    : "No active session";

  return (
    <div className="space-y-5">
      <div className="hi5-panel p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs opacity-70">Device</div>
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-xs font-semibold",
                  device?.online ? statusClass("good") : statusClass("bad"),
                ].join(" ")}
              >
                {device?.online ? "Online" : "Offline"}
              </span>
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-xs font-semibold",
                  remoteActive ? statusClass("good") : statusClass("neutral"),
                ].join(" ")}
              >
                {remoteLabel}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold mt-1 break-words">{displayName}</h1>

            <p className="text-sm opacity-75 mt-2">
              {text(device?.os, "Unknown OS")} · Last seen {formatDate(device?.last_seen_at)} · Agent{" "}
              {text(device?.agent_version)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canRemote ? (
              <Link className="hi5-btn-primary text-sm" href={`/control/devices/${encodeURIComponent(deviceId)}?tab=remote`}>
                Connect
              </Link>
            ) : (
              <LockedButton label="Connect" />
            )}

            {canTerminal ? (
              <Link className="hi5-btn-ghost text-sm" href={`/control/devices/${encodeURIComponent(deviceId)}?tab=terminal`}>
                Terminal
              </Link>
            ) : (
              <LockedButton label="Terminal" />
            )}

            {canFiles ? (
              <Link className="hi5-btn-ghost text-sm" href={`/control/devices/${encodeURIComponent(deviceId)}?tab=files`}>
                Files
              </Link>
            ) : (
              <LockedButton label="Files" />
            )}

            <Link className="hi5-btn-ghost text-sm" href={`/control/devices/${encodeURIComponent(deviceId)}?tab=services`}>
              Services
            </Link>

            <button className="hi5-btn-ghost text-sm" type="button" title="Coming soon">
              Reboot
            </button>

            <button className="hi5-btn-ghost text-sm" type="button" title="Coming soon">
              Refresh inventory
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <TabLink
            href={`/control/devices/${encodeURIComponent(deviceId)}?tab=overview`}
            active={tab === "overview"}
            label="Overview"
          />
          <TabLink
            href={`/control/devices/${encodeURIComponent(deviceId)}?tab=remote`}
            active={tab === "remote"}
            label="Remote"
            locked={!canRemote}
          />
          <TabLink
            href={`/control/devices/${encodeURIComponent(deviceId)}?tab=terminal`}
            active={tab === "terminal"}
            label="Terminal"
            locked={!canTerminal}
          />
          <TabLink
            href={`/control/devices/${encodeURIComponent(deviceId)}?tab=files`}
            active={tab === "files"}
            label="Files"
            locked={!canFiles}
          />
          <TabLink
            href={`/control/devices/${encodeURIComponent(deviceId)}?tab=services`}
            active={tab === "services"}
            label="Services"
          />
          <TabLink
            href={`/control/devices/${encodeURIComponent(deviceId)}?tab=activity`}
            active={tab === "activity"}
            label="Activity"
          />
        </div>
      </div>

      {tab === "overview" ? <Overview device={device} inventory={inventory} activeSessions={activeSessions} /> : null}
      {tab === "remote" ? <RemotePanel deviceId={deviceId} /> : null}
      {tab === "terminal" ? <TerminalPanel deviceId={deviceId} /> : null}
      {tab === "files" ? <FileBrowserPanel deviceId={deviceId} /> : null}
      {tab === "services" ? <ServicesPanel deviceId={deviceId} /> : null}
      {tab === "activity" ? <ActivityPanel deviceId={deviceId} /> : null}

      {!["overview", "remote", "terminal", "files", "services", "activity"].includes(tab) ? (
        <div className="hi5-panel p-5">
          <div className="text-lg font-semibold capitalize">{tab}</div>
          <p className="text-sm opacity-75 mt-2">This tab is coming soon.</p>
        </div>
      ) : null}
    </div>
  );
}
