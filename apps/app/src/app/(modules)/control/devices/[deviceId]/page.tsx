import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import TerminalPanel from "./ui/terminal-panel";
import FileBrowserPanel from "./ui/file-browser-panel";
import ServicesPanel from "./ui/services-panel";
import ActivityPanel from "./ui/activity-panel";
import InventoryRefreshPanel from "./ui/inventory-refresh-panel";
import RemotePanel from "./ui/remote-panel";
import AssetLinkPanel from "../../ui/asset-link-panel";
import CreateIncidentFromDeviceButton from "../../ui/create-incident-from-device-button";
import DeviceTicketsPanel from "../../ui/device-tickets-panel";
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
  software?: JsonRecord | null;
  windows_updates?: JsonRecord | null;
  updates?: JsonRecord | null;
  events_summary?: JsonRecord | null;
  event_health?: JsonRecord | null;
  gpu?: JsonRecord | null;
  warranty_identity?: JsonRecord | null;
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

type HealthTone = "good" | "warning" | "bad" | "info" | "neutral";

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function boolText(value: any) {
  if (value === true) return "Enabled";
  if (value === false) return "Disabled";
  return "—";
}

function yesNo(value: any) {
  if (value === true) return "Yes";
  if (value === false) return "No";
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

function numberOrNull(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fallbackTrend(current: any) {
  const n = numberOrNull(current);

  if (n === null) {
    return [18, 24, 20, 28, 26, 32, 29, 34, 31, 36, 33, 38];
  }

  const base = Math.max(5, Math.min(95, n));

  return [
    Math.max(0, base - 16),
    Math.max(0, base - 10),
    Math.max(0, base - 14),
    Math.max(0, base - 6),
    Math.max(0, base - 8),
    Math.max(0, base - 2),
    Math.min(100, base + 3),
    Math.max(0, base - 4),
    Math.min(100, base + 6),
    Math.max(0, base - 1),
    Math.min(100, base + 4),
    base,
  ];
}

function getTrend(obj: JsonRecord | null | undefined, keys: string[], current: any) {
  if (obj) {
    for (const key of keys) {
      const value = obj[key];

      if (Array.isArray(value) && value.length) {
        return value
          .map((item) => {
            if (typeof item === "number") return item;

            if (item && typeof item === "object") {
              return numberOrNull(item.value ?? item.usage ?? item.percent);
            }

            return null;
          })
          .filter((item): item is number => item !== null)
          .slice(-24);
      }
    }
  }

  return fallbackTrend(current);
}

function toneClass(tone: HealthTone) {
  if (tone === "good") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  }

  if (tone === "warning") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200";
  }

  if (tone === "bad") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-200";
  }

  if (tone === "info") {
    return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200";
  }

  return "hi5-border bg-black/5 dark:bg-white/5";
}

function getPercentTone(value: any, warning = 80, bad = 92): HealthTone {
  const n = Number(value);
  if (!Number.isFinite(n)) return "neutral";
  if (n >= bad) return "bad";
  if (n >= warning) return "warning";
  return "good";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: HealthTone;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClass(tone),
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-5">
      <div className="text-sm font-bold">{title}</div>
      <div className="text-sm opacity-70 mt-1">{description}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function InfoCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: HealthTone;
}) {
  return (
    <div className={["rounded-2xl border p-4 min-h-[112px]", toneClass(tone)].join(" ")}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-2xl font-extrabold mt-1 break-words">{value}</div>
      {sub ? <div className="text-xs opacity-75 mt-1 leading-relaxed">{sub}</div> : null}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const clean = values.length ? values : fallbackTrend(null);
  const width = 220;
  const height = 64;
  const max = Math.max(100, ...clean);
  const min = Math.min(0, ...clean);
  const range = Math.max(1, max - min);

  const points = clean
    .map((value, index) => {
      const x = clean.length === 1 ? 0 : (index / (clean.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full overflow-visible" role="img" aria-label="Usage trend">
      <defs>
        <linearGradient id="hi5TrendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <polyline points={`0,${height} ${points} ${width},${height}`} fill="url(#hi5TrendFill)" stroke="none" />

      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsageTrendCard({
  label,
  value,
  sub,
  values,
  tone,
  badge = "Live",
}: {
  label: string;
  value: string;
  sub: string;
  values: number[];
  tone: HealthTone;
  badge?: string;
}) {
  return (
    <div className={["rounded-2xl border p-4 min-h-[168px]", toneClass(tone)].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs opacity-70">{label}</div>
          <div className="text-2xl font-extrabold mt-1">{value}</div>
        </div>

        <span className="rounded-full border border-current/20 px-2 py-1 text-[11px] font-bold">
          {badge}
        </span>
      </div>

      <div className="mt-3 opacity-90">
        <Sparkline values={values} />
      </div>

      <div className="text-xs opacity-75 mt-2 leading-relaxed">{sub}</div>
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
  right,
}: {
  title: string;
  children: ReactNode;
  note?: string;
  right?: ReactNode;
}) {
  return (
    <section className="hi5-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {note ? <div className="text-xs opacity-70 mt-1">{note}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
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
  badge,
}: {
  href: string;
  active: boolean;
  label: string;
  locked?: boolean;
  badge?: string;
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
        "rounded-2xl px-3 py-2 text-sm border hi5-border transition inline-flex items-center gap-2",
        active
          ? "bg-[rgba(var(--hi5-accent),0.10)] border-[rgba(var(--hi5-accent),0.28)]"
          : "hover:bg-black/5 dark:hover:bg-white/5",
      ].join(" ")}
    >
      <span>{label}</span>
      {badge ? <span className="rounded-full bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[10px]">{badge}</span> : null}
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

function ComingSoonTab({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="hi5-panel p-5 space-y-4">
      <div>
        <div className="text-lg font-extrabold">{title}</div>
        <p className="text-sm opacity-75 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border hi5-border bg-black/5 dark:bg-white/5 p-4">
            <div className="text-sm font-semibold">{item}</div>
            <div className="text-xs opacity-65 mt-1">Planned for a future Control pass.</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function getList(obj: any, keys: string[]) {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== "object") return [];

  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function formatInstallDate(value: any) {
  if (!value) return "—";
  const raw = String(value);

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`;
  }

  return formatDate(raw);
}

function SmallTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[];
  rows: any[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border hi5-border">
      <table className="min-w-full text-sm">
        <thead className="bg-black/5 dark:bg-white/5">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 text-left text-xs font-bold opacity-70 whitespace-nowrap">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? row.name ?? row.title ?? index} className="border-t hi5-border align-top">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 whitespace-nowrap max-w-[360px] overflow-hidden text-ellipsis">
                  {column.render ? column.render(row) : text(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HardwareTab({ inventory }: { inventory: DeviceInventory | null }) {
  const hardware = inventory?.hardware ?? {};
  const warranty = inventory?.warranty_identity ?? {};
  const gpu = inventory?.gpu ?? {};
  const displays = asArray(inventory?.displays);

  return (
    <div className="space-y-4">
      <Section title="Warranty-ready identity" note="Manufacturer, model, serial, asset tag and BIOS identity collected via WMI/CIM.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Manufacturer" value={firstValue(warranty, ["manufacturer"], firstValue(hardware, ["manufacturer"]))} />
          <Field label="Model" value={firstValue(warranty, ["model"], firstValue(hardware, ["model"]))} />
          <Field label="Serial number" value={firstValue(warranty, ["serial_number"], firstValue(hardware, ["serial_number", "serial"]))} />
          <Field label="Asset tag" value={firstValue(warranty, ["asset_tag"], firstValue(hardware, ["asset_tag"]))} />
          <Field label="Device UUID" value={firstValue(warranty, ["device_uuid"], firstValue(hardware, ["device_uuid", "uuid"]))} />
          <Field label="BIOS vendor" value={firstValue(warranty, ["bios_vendor"], firstValue(hardware, ["bios_vendor"]))} />
          <Field label="BIOS version" value={firstValue(warranty, ["bios_version"], firstValue(hardware, ["bios_version"]))} />
          <Field label="BIOS date" value={firstValue(warranty, ["bios_date"], firstValue(hardware, ["bios_date"]))} />
        </div>
      </Section>

      <Section title="GPU and displays" note="Useful for remote stream quality, black screen and multi-monitor support.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="GPU" value={firstValue(gpu, ["name"], firstValue(hardware, ["gpu", "gpu_name"]))} />
          <Field label="Driver version" value={firstValue(gpu, ["driver_version"], firstValue(hardware, ["gpu_driver", "gpu_driver_version"]))} />
          <Field label="Driver date" value={firstValue(gpu, ["driver_date"])} />
        </div>

        {displays.length ? (
          <SmallTable
            columns={[
              { key: "name", label: "Display" },
              { key: "resolution", label: "Resolution", render: (row) => `${text(row.width)}×${text(row.height)}` },
              { key: "scale", label: "Scale", render: (row) => formatPercent(row.scale_percent ?? row.scale) },
              { key: "primary", label: "Primary", render: (row) => yesNo(row.primary) },
            ]}
            rows={displays}
            emptyTitle="No display inventory"
            emptyDescription="Monitor inventory will appear after the next agent inventory pass."
          />
        ) : null}
      </Section>
    </div>
  );
}

function SecurityTab({ inventory }: { inventory: DeviceInventory | null }) {
  const security = inventory?.security ?? {};
  const tpm = firstValue(security, ["tpm"], {}) as JsonRecord;
  const localAdmins = getList(security?.local_admins, ["items", "members"]);
  const bitlockerVolumes = getList(firstValue(security, ["bitlocker_volumes", "bitlocker"], []), ["items", "volumes"]);

  return (
    <div className="space-y-4">
      <Section title="Security posture" note="Defender, firewall, Secure Boot, TPM and local administrator posture.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Defender" value={boolText(firstValue(security, ["defender_enabled", "antivirus_enabled"]))} />
          <Field label="Defender real-time" value={boolText(firstValue(security, ["defender_realtime_enabled", "realtime_protection_enabled"]))} />
          <Field label="Firewall" value={boolText(firstValue(security, ["firewall_enabled"]))} />
          <Field label="Secure Boot" value={boolText(firstValue(security, ["secure_boot_enabled"]))} />
          <Field label="TPM present" value={yesNo(firstValue(security, ["tpm_present"], firstValue(tpm, ["present"])))} />
          <Field label="TPM enabled" value={yesNo(firstValue(security, ["tpm_enabled"], firstValue(tpm, ["enabled"])))} />
          <Field label="TPM owned" value={yesNo(firstValue(tpm, ["owned"]))} />
          <Field label="TPM spec version" value={firstValue(tpm, ["spec_version", "version"])} />
        </div>
      </Section>

      <Section title="BitLocker volumes" note="Real BitLocker status reported per drive.">
        <SmallTable
          columns={[
            { key: "mount", label: "Drive", render: (row) => text(row.drive ?? row.mount ?? row.letter ?? row.name) },
            { key: "status", label: "Protection", render: (row) => text(row.protection_status ?? row.status ?? row.bitlocker_status) },
            { key: "encryption", label: "Encryption", render: (row) => text(row.encryption_method ?? row.method) },
            { key: "percentage", label: "Encrypted", render: (row) => formatPercent(row.encryption_percentage ?? row.percentage) },
            { key: "lock", label: "Lock", render: (row) => text(row.lock_status ?? row.locked) },
          ]}
          rows={bitlockerVolumes}
          emptyTitle="No BitLocker volume details"
          emptyDescription="BitLocker details will appear after the agent reports the security inventory."
        />
      </Section>

      <Section title="Local administrators" note="Useful for privilege drift checks.">
        <SmallTable
          columns={[
            { key: "name", label: "Account", render: (row) => text(row.name ?? row.account ?? row.member) },
            { key: "domain", label: "Domain", render: (row) => text(row.domain) },
            { key: "type", label: "Type", render: (row) => text(row.type ?? row.object_class) },
          ]}
          rows={localAdmins}
          emptyTitle="No local admin list yet"
          emptyDescription="Local administrator membership will appear after the agent reports it."
        />
      </Section>
    </div>
  );
}

function StorageTab({ inventory }: { inventory: DeviceInventory | null }) {
  const storage = asArray(inventory?.storage);

  return (
    <Section title="Storage" note="Disk usage, filesystem and BitLocker protection per volume.">
      <SmallTable
        columns={[
          { key: "drive", label: "Drive", render: (row) => text(row.letter ?? row.mount ?? row.name) },
          { key: "file_system", label: "Filesystem", render: (row) => text(row.file_system ?? row.fs) },
          { key: "used", label: "Used", render: (row) => formatPercent(row.used_percent) },
          { key: "free", label: "Free", render: (row) => formatBytes(row.free_bytes ?? row.free) },
          { key: "total", label: "Total", render: (row) => formatBytes(row.total_bytes ?? row.total) },
          { key: "bitlocker", label: "BitLocker", render: (row) => text(row.bitlocker_status ?? row.bitlocker) },
        ]}
        rows={storage}
        emptyTitle="No storage inventory yet"
        emptyDescription="Drive inventory will appear after the agent uploads storage details."
      />
    </Section>
  );
}

function NetworkTab({ inventory }: { inventory: DeviceInventory | null }) {
  const network = inventory?.network ?? {};
  const adapters = getList(network, ["adapters", "items"]);

  return (
    <div className="space-y-4">
      <Section title="Network summary" note="Primary network details used by technicians before remote support.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Primary IPv4" value={firstValue(network, ["primary_ipv4", "ipv4", "ip"])} />
          <Field label="MAC address" value={firstValue(network, ["mac", "mac_address"])} />
          <Field label="Adapter" value={firstValue(network, ["adapter", "adapter_name"])} />
          <Field label="Connection type" value={firstValue(network, ["connection_type", "type"])} />
          <Field label="Default gateway" value={firstValue(network, ["gateway", "default_gateway"])} />
          <Field label="DNS servers" value={firstValue(network, ["dns", "dns_servers"])} />
          <Field label="Domain/workgroup" value={firstValue(network, ["domain", "workgroup"])} />
          <Field label="Public IP" value={firstValue(network, ["public_ip", "wan_ip"])} />
        </div>
      </Section>

      <Section title="Adapters" note="All adapter records reported by the agent.">
        <SmallTable
          columns={[
            { key: "name", label: "Name", render: (row) => text(row.name ?? row.adapter ?? row.description) },
            { key: "status", label: "Status", render: (row) => text(row.status ?? row.oper_status) },
            { key: "mac", label: "MAC", render: (row) => text(row.mac ?? row.mac_address) },
            { key: "ipv4", label: "IPv4", render: (row) => Array.isArray(row.ipv4) ? row.ipv4.join(", ") : text(row.ipv4 ?? row.ip) },
            { key: "gateway", label: "Gateway", render: (row) => text(row.gateway ?? row.default_gateway) },
          ]}
          rows={adapters}
          emptyTitle="No adapter list yet"
          emptyDescription="Network adapters will appear after the agent reports detailed network inventory."
        />
      </Section>
    </div>
  );
}

function SoftwareInventoryTab({ inventory }: { inventory: DeviceInventory | null }) {
  const software = inventory?.software ?? inventory?.software_summary ?? {};
  const rows = getList(software, ["items", "apps", "installed"]);
  const recent = getList(software, ["recently_installed"]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <InfoCard label="Installed apps" value={text(firstValue(software, ["count", "installed_apps", "installed_count"], rows.length))} tone="info" />
        <InfoCard label="Recently installed" value={text(firstValue(software, ["recently_installed_count"], recent.length))} tone="neutral" />
        <InfoCard label="Quiet uninstall available" value={text(rows.filter((row) => row.quiet_uninstall_string).length)} tone="neutral" />
        <InfoCard label="Inventory state" value={text(firstValue(software, ["status"], inventory?.collected_at ? "Collected" : "Pending"))} tone={inventory?.collected_at ? "good" : "warning"} />
      </div>

      <Section title="Installed software" note="Registry 64-bit, 32-bit and current-user uninstall inventory.">
        <SmallTable
          columns={[
            { key: "name", label: "Name" },
            { key: "publisher", label: "Publisher" },
            { key: "version", label: "Version" },
            { key: "install_date", label: "Install date", render: (row) => formatInstallDate(row.install_date) },
            { key: "scope", label: "Source", render: (row) => text(row.scope) },
            { key: "quiet_uninstall_string", label: "Quiet uninstall", render: (row) => row.quiet_uninstall_string ? "Yes" : "No" },
          ]}
          rows={rows}
          emptyTitle="No software inventory yet"
          emptyDescription="Installed software will appear after the agent uploads the full inventory table."
        />
      </Section>
    </div>
  );
}

function UpdatesTab({ inventory }: { inventory: DeviceInventory | null }) {
  const updates = inventory?.windows_updates ?? inventory?.updates ?? {};
  const rows = getList(updates, ["updates", "items", "pending"]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InfoCard label="Pending updates" value={text(firstValue(updates, ["pending_count"], rows.length))} tone={rows.length ? "warning" : "good"} />
        <InfoCard label="Last scan" value={formatDate(firstValue(updates, ["last_scan_utc", "last_scan_at"]))} tone="neutral" />
        <InfoCard label="Collector error" value={text(firstValue(updates, ["error"], "None"))} tone={firstValue(updates, ["error"]) ? "warning" : "good"} />
      </div>

      <Section title="Pending Windows updates" note="Updates detected by the agent using the Windows Update COM API.">
        <SmallTable
          columns={[
            { key: "title", label: "Title" },
            { key: "kb", label: "KB", render: (row) => Array.isArray(row.kb) ? row.kb.join(", ") : text(row.kb) },
            { key: "severity", label: "Severity" },
            { key: "mandatory", label: "Mandatory", render: (row) => yesNo(row.mandatory) },
            { key: "downloaded", label: "Downloaded", render: (row) => yesNo(row.downloaded) },
            { key: "reboot_required", label: "Reboot", render: (row) => yesNo(row.reboot_required) },
          ]}
          rows={rows}
          emptyTitle="No pending updates"
          emptyDescription="No pending Windows updates were reported, or the update collector has not run yet."
        />
      </Section>
    </div>
  );
}

function EventHealthTab({ inventory }: { inventory: DeviceInventory | null }) {
  const events = inventory?.event_health ?? inventory?.events_summary ?? {};
  const shutdowns = getList(events, ["unexpected_shutdown_events", "shutdowns"]);
  const crashes = getList(events, ["recent_crash_events", "crashes", "application_crashes"]);
  const serviceFailures = getList(events, ["service_failure_events", "service_failures_events"]);
  const updateFailures = getList(events, ["update_failure_events", "windows_update_failure_events"]);
  const allRows = [
    ...shutdowns.map((row) => ({ ...row, category: "Unexpected shutdown" })),
    ...crashes.map((row) => ({ ...row, category: "Application crash" })),
    ...serviceFailures.map((row) => ({ ...row, category: "Service failure" })),
    ...updateFailures.map((row) => ({ ...row, category: "Update failure" })),
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <InfoCard label="Unexpected shutdowns" value={text(firstValue(events, ["unexpected_shutdowns"], shutdowns.length))} tone={Number(firstValue(events, ["unexpected_shutdowns"], 0)) > 0 ? "warning" : "good"} />
        <InfoCard label="Recent crashes" value={text(firstValue(events, ["recent_crashes"], crashes.length))} tone={Number(firstValue(events, ["recent_crashes"], 0)) > 0 ? "warning" : "good"} />
        <InfoCard label="Update failures" value={text(firstValue(events, ["update_failures", "windows_update_failures"], updateFailures.length))} tone={Number(firstValue(events, ["update_failures", "windows_update_failures"], 0)) > 0 ? "warning" : "good"} />
        <InfoCard label="Service failures" value={text(firstValue(events, ["service_failures"], serviceFailures.length))} tone={Number(firstValue(events, ["service_failures"], 0)) > 0 ? "warning" : "good"} />
      </div>

      <Section title="Recent event details" note="High-value events from the last reported event-health window.">
        <SmallTable
          columns={[
            { key: "category", label: "Category" },
            { key: "time_created", label: "Time", render: (row) => formatDate(row.time_created) },
            { key: "id", label: "Event ID" },
            { key: "provider", label: "Provider" },
            { key: "message", label: "Message" },
          ]}
          rows={allRows}
          emptyTitle="No recent event-health records"
          emptyDescription="No crashes, update failures, service failures or unexpected shutdowns were reported."
        />
      </Section>
    </div>
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

  // Prefer the live control-server snapshot so the page updates as soon as the
  // agent sends inventory. Then mirror it into Supabase for the rest of the app.
  try {
    const upstream = await fetch(
      `${RMM_API_BASE}/api/devices/${encodeURIComponent(deviceId)}/inventory`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "X-Tenant-ID": tenantId,
        },
      }
    );

    if (upstream.ok) {
      const json = await upstream.json().catch(() => null);
      const inventory = json?.inventory ?? null;

      if (inventory) {
        const row = {
          tenant_id: tenantId,
          device_id: deviceId,
          summary: inventory.summary ?? {},
          hardware: inventory.hardware ?? {},
          warranty_identity: inventory.warranty_identity ?? {},
          os: inventory.os ?? {},
          cpu: inventory.cpu ?? {},
          memory: inventory.memory ?? {},
          storage: inventory.storage ?? [],
          security: inventory.security ?? {},
          network: inventory.network ?? {},
          sessions: inventory.sessions ?? {},
          displays: inventory.displays ?? [],
          gpu: inventory.gpu ?? {},
          battery: inventory.battery ?? {},
          agent: inventory.agent ?? {},
          health: inventory.health ?? {},
          software_summary: inventory.software_summary ?? {},
          software: inventory.software ?? inventory.software_summary ?? {},
          services_summary: inventory.services_summary ?? {},
          windows_updates: inventory.windows_updates ?? inventory.updates ?? {},
          updates: inventory.updates ?? inventory.windows_updates ?? {},
          events_summary: inventory.events_summary ?? {},
          event_health: inventory.event_health ?? inventory.events_summary ?? {},
          collected_at: inventory.collected_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: syncError } = await admin
          .from("device_inventory")
          .upsert(row, { onConflict: "tenant_id,device_id" });

        if (syncError) {
          console.error("[control/device] inventory Supabase sync failed", syncError.message);
        }

        return row as DeviceInventory;
      }
    }
  } catch (err) {
    console.error("[control/device] live inventory fetch failed", err);
  }

  const { data, error } = await admin
    .from("device_inventory")
    .select(
      "summary, hardware, warranty_identity, os, cpu, memory, storage, security, network, sessions, displays, gpu, battery, agent, health, software_summary, software, services_summary, windows_updates, updates, events_summary, event_health, collected_at"
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
  deviceId,
  device,
  inventory,
  activeSessions,
}: {
  deviceId: string;
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
  const tpmPresent = firstValue(security, ["tpm_present", "tpmPresent"]);
  const secureBoot = firstValue(security, ["secure_boot_enabled", "secureBoot"]);
  const cpuUsage = firstValue(cpu, ["usage_percent", "usage", "load_percent"]);
  const memoryUsage = firstValue(memory, ["usage_percent", "used_percent"]);

  const primaryDrive = storage[0];
  const primaryDriveUsage = primaryDrive?.used_percent;
  const inventoryReady = Boolean(inventory?.collected_at);

  return (
    <div className="space-y-4">
      {!inventoryReady ? (
        <EmptyState
          title="Waiting for detailed inventory"
          description="The device page is ready, but the agent has not uploaded detailed CPU, memory, storage, security and hardware inventory yet. These fields will populate after the agent inventory upload pass."
        />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
        <InfoCard
          label="Remote session"
          value={remoteActive ? "Active" : "Inactive"}
          sub={
            remoteActive
              ? activeModes.map((m) => (m === "backstage" ? "Background" : "Console")).join(" + ")
              : activeSessions.error
                ? "Endpoint unavailable"
                : "No viewer connected"
          }
          tone={remoteActive ? "good" : activeSessions.error ? "warning" : "neutral"}
        />

        <InfoCard
          label="CPU"
          value={formatPercent(cpuUsage)}
          sub={text(firstValue(cpu, ["name", "model", "brand"], "Waiting for inventory"))}
          tone={getPercentTone(cpuUsage, 75, 90)}
        />

        <InfoCard
          label="Memory"
          value={formatPercent(memoryUsage)}
          sub={`${formatBytes(firstValue(memory, ["used_bytes", "used"]))} used / ${formatBytes(firstValue(memory, ["total_bytes", "total"]))} total`}
          tone={getPercentTone(memoryUsage, 80, 92)}
        />

        <InfoCard
          label="Disk"
          value={primaryDrive ? formatPercent(primaryDriveUsage) : diskWarning === true ? "Warning" : "—"}
          sub={
            primaryDrive
              ? `${text(primaryDrive.letter ?? primaryDrive.mount ?? primaryDrive.name)} · ${formatBytes(primaryDrive.free_bytes ?? primaryDrive.free)} free`
              : "Waiting for inventory"
          }
          tone={diskWarning === true ? "warning" : getPercentTone(primaryDriveUsage, 85, 95)}
        />

        <InfoCard
          label="Security"
          value={defenderOk === false || tpmEnabled === false ? "Attention" : defenderOk === true ? "Good" : "—"}
          sub={`TPM ${boolText(tpmEnabled)} · Secure Boot ${boolText(secureBoot)}`}
          tone={defenderOk === false || tpmEnabled === false ? "warning" : defenderOk === true ? "good" : "neutral"}
        />

        <InfoCard
          label="Reboot"
          value={rebootRequired === true ? "Required" : rebootRequired === false ? "No" : "—"}
          sub="Pending reboot state"
          tone={rebootRequired === true ? "warning" : rebootRequired === false ? "good" : "neutral"}
        />

        <InfoCard
          label="Agent"
          value={device?.online ? "Online" : "Offline"}
          sub={`Last seen ${formatDate(device?.last_seen_at)}`}
          tone={device?.online ? "good" : "bad"}
        />
      </div>

      <div className="hi5-card p-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="text-sm font-bold">Technician summary</div>
            <div className="text-sm opacity-75 mt-1 leading-relaxed">
              {remoteActive ? "A technician is currently connected to this device. " : "No active remote viewer is currently connected. "}
              {inventory?.collected_at
                ? `Inventory last collected ${formatDate(inventory.collected_at)}.`
                : "Detailed inventory has not been reported yet."}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone={device?.online ? "good" : "bad"}>{device?.online ? "Online" : "Offline"}</Badge>
            <Badge tone={remoteActive ? "good" : "neutral"}>{remoteActive ? "Remote active" : "Remote idle"}</Badge>
            <Badge tone={rebootRequired === true ? "warning" : rebootRequired === false ? "good" : "neutral"}>
              {rebootRequired === true ? "Reboot required" : rebootRequired === false ? "No reboot" : "Reboot unknown"}
            </Badge>
            <Badge tone={inventoryReady ? "good" : "warning"}>{inventoryReady ? "Inventory ready" : "Inventory pending"}</Badge>
          </div>
        </div>
      </div>

      <AssetLinkPanel deviceId={deviceId} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <UsageTrendCard
          label="CPU usage"
          value={formatPercent(cpuUsage)}
          sub={text(firstValue(cpu, ["name", "model", "brand"], "Waiting for inventory"))}
          values={getTrend(cpu, ["history", "usage_history", "samples"], cpuUsage)}
          tone={getPercentTone(cpuUsage, 75, 90)}
          badge={inventoryReady ? "Live" : "Demo"}
        />

        <UsageTrendCard
          label="Memory usage"
          value={formatPercent(memoryUsage)}
          sub={`${formatBytes(firstValue(memory, ["used_bytes", "used"]))} used / ${formatBytes(firstValue(memory, ["total_bytes", "total"]))} total`}
          values={getTrend(memory, ["history", "usage_history", "samples"], memoryUsage)}
          tone={getPercentTone(memoryUsage, 80, 92)}
          badge={inventoryReady ? "Live" : "Demo"}
        />

        <UsageTrendCard
          label="Primary disk"
          value={primaryDrive ? formatPercent(primaryDriveUsage) : "—"}
          sub={
            primaryDrive
              ? `${text(primaryDrive.letter ?? primaryDrive.mount ?? primaryDrive.name)} · ${formatBytes(primaryDrive.free_bytes ?? primaryDrive.free)} free`
              : "Waiting for storage inventory"
          }
          values={getTrend(primaryDrive ?? {}, ["history", "usage_history", "samples"], primaryDriveUsage)}
          tone={diskWarning === true ? "warning" : getPercentTone(primaryDriveUsage, 85, 95)}
          badge={inventoryReady ? "Live" : "Demo"}
        />

        <UsageTrendCard
          label="Network"
          value={text(firstValue(network, ["status", "connection_status"], "—"))}
          sub={`${text(firstValue(network, ["adapter", "adapter_name"], "Adapter pending"))} · ${text(firstValue(network, ["primary_ipv4", "ipv4", "ip"], "No IP yet"))}`}
          values={getTrend(network, ["latency_history", "usage_history", "samples"], firstValue(network, ["latency_ms"], 24))}
          tone="info"
          badge={inventoryReady ? "Live" : "Demo"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section title="System" note="Core OS and device identity.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Hostname" value={firstValue(summary, ["hostname"], device?.hostname)} />
            <Field label="Operating system" value={firstValue(osInfo, ["name", "caption"], device?.os)} />
            <Field label="OS version" value={firstValue(osInfo, ["version", "display_version"])} />
            <Field label="OS build" value={firstValue(osInfo, ["build", "build_number"])} />
            <Field label="Architecture" value={firstValue(osInfo, ["architecture", "arch"], device?.arch)} />
            <Field label="Install date" value={formatDate(firstValue(osInfo, ["install_date", "installed_at"]))} />
            <Field label="Last boot" value={formatDate(firstValue(osInfo, ["last_boot", "last_boot_time"]))} />
            <Field label="Uptime" value={firstValue(osInfo, ["uptime", "uptime_text"])} />
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
            <Field label="CPU usage" value={formatPercent(cpuUsage)} />
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
        <Section
          title="Security posture"
          note="Core Windows security and compliance checks."
          right={
            defenderOk === false || tpmEnabled === false || secureBoot === false ? (
              <Badge tone="warning">Attention</Badge>
            ) : defenderOk === true ? (
              <Badge tone="good">Good</Badge>
            ) : (
              <Badge tone="neutral">Unknown</Badge>
            )
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="TPM present" value={yesNo(tpmPresent)} />
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
            {storage.map((drive, index) => {
              const usedPercent = drive.used_percent;

              return (
                <div key={index} className={["rounded-2xl border p-4", toneClass(getPercentTone(usedPercent, 85, 95))].join(" ")}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold">{text(drive.letter ?? drive.mount ?? drive.name, `Drive ${index + 1}`)}</div>
                    <div className="text-xs opacity-70">{text(drive.file_system ?? drive.fs)}</div>
                  </div>

                  <div className="text-2xl font-extrabold mt-2">{formatPercent(usedPercent)}</div>

                  <div className="text-xs opacity-75 mt-1">
                    {formatBytes(drive.free_bytes ?? drive.free)} free / {formatBytes(drive.total_bytes ?? drive.total)} total
                  </div>

                  <div className="text-xs opacity-75 mt-1">
                    BitLocker {text(drive.bitlocker_status ?? drive.bitlocker)}
                  </div>

                  <div className="mt-3 opacity-90">
                    <Sparkline values={getTrend(drive, ["history", "usage_history", "samples"], usedPercent)} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No storage inventory yet"
            description="Drive capacity, free space, filesystem and BitLocker status will appear here once the agent uploads inventory."
          />
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

        <Section title="Software and services summary" note="Detailed tabs are prepared below for later inventory expansion.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Installed apps" value={firstValue(softwareSummary, ["installed_count", "apps_count"])} />
            <Field label="Recently installed" value={firstValue(softwareSummary, ["recently_installed_count"])} />
            <Field label="Running services" value={firstValue(servicesSummary, ["running_count"])} />
            <Field label="Stopped critical services" value={firstValue(servicesSummary, ["stopped_critical_count"])} />
          </div>
        </Section>
      </div>

      <Section
        title="Active remote sessions"
        note="This will show Console or Background Mode once the control-server active-session endpoint is wired in."
        right={remoteActive ? <Badge tone="good">Live</Badge> : <Badge tone="neutral">Idle</Badge>}
      >
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
          <EmptyState
            title="No active remote session"
            description={
              activeSessions.error
                ? `The page is ready, but the control-server active-session endpoint is not available yet: ${activeSessions.error}`
                : "No technician is currently connected to this device."
            }
          />
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

  if (!device) {
    return (
      <div className="min-h-[100dvh] space-y-5 pb-28">
        <div className="hi5-panel p-5">
          <div className="text-xs opacity-70">Control</div>
          <h1 className="text-2xl font-extrabold mt-1">Device not found</h1>
          <p className="text-sm opacity-75 mt-2">
            This device either does not exist, belongs to another tenant, or has not enrolled successfully.
          </p>

          <div className="mt-4">
            <Link href="/control/devices" className="hi5-btn-primary text-sm">
              Back to devices
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = device.hostname || deviceId;
  const remoteActive = activeSessions.active === true && (activeSessions.sessions?.length ?? 0) > 0;
  const remoteLabel = remoteActive
    ? (activeSessions.sessions ?? []).some((session) => session.mode === "backstage")
      ? "Background active"
      : "Remote active"
    : "No active session";

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "hardware", label: "Hardware" },
    { key: "security", label: "Security" },
    { key: "storage", label: "Storage" },
    { key: "network", label: "Network" },
    { key: "software", label: "Software" },
    { key: "patching", label: "Updates" },
    { key: "events", label: "Event health" },
    { key: "tickets", label: "Tickets" },
    { key: "remote", label: "Remote", locked: !canRemote },
    { key: "terminal", label: "Terminal", locked: !canTerminal },
    { key: "files", label: "Files", locked: !canFiles },
    { key: "services", label: "Services" },
    { key: "processes", label: "Processes", badge: "Soon" },
    { key: "jobs", label: "Jobs", badge: "Soon" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="min-h-[100dvh] space-y-5 pb-28">
      <div className="hi5-panel p-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs opacity-70">Device</div>
              <Badge tone={device.online ? "good" : "bad"}>{device.online ? "Online" : "Offline"}</Badge>
              <Badge tone={remoteActive ? "good" : "neutral"}>{remoteLabel}</Badge>
              <Badge tone={inventory?.collected_at ? "good" : "warning"}>
                {inventory?.collected_at ? "Inventory ready" : "Inventory pending"}
              </Badge>
            </div>

            <h1 className="text-2xl font-extrabold mt-2 break-words">{displayName}</h1>

            <p className="text-sm opacity-75 mt-2">
              {text(device.os, "Unknown OS")} · Last seen {formatDate(device.last_seen_at)} · Agent{" "}
              {text(device.agent_version)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            {canRemote ? (
              <Link className="hi5-btn-primary text-sm" href={`/control/devices/${encodeURIComponent(deviceId)}?tab=remote`}>
                Remote Control
              </Link>
            ) : (
              <LockedButton label="Remote Control" />
            )}

            {canRemote ? (
              <Link className="hi5-btn-ghost text-sm" href={`/control/devices/${encodeURIComponent(deviceId)}?tab=remote&mode=backstage`}>
                Background Mode
              </Link>
            ) : (
              <LockedButton label="Background Mode" />
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

            <InventoryRefreshPanel
              deviceId={deviceId}
              remoteActive={remoteActive}
              collectedAt={inventory?.collected_at}
            />

            <CreateIncidentFromDeviceButton deviceId={deviceId} hostname={device.hostname} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <TabLink
              key={item.key}
              href={`/control/devices/${encodeURIComponent(deviceId)}?tab=${item.key}`}
              active={tab === item.key}
              label={item.label}
              locked={item.locked}
              badge={item.badge}
            />
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <Overview
          deviceId={deviceId}
          device={device}
          inventory={inventory}
          activeSessions={activeSessions}
        />
      ) : null}

      {tab === "hardware" ? <HardwareTab inventory={inventory} /> : null}
      {tab === "security" ? <SecurityTab inventory={inventory} /> : null}
      {tab === "storage" ? <StorageTab inventory={inventory} /> : null}
      {tab === "network" ? <NetworkTab inventory={inventory} /> : null}

      {tab === "tickets" ? (
        <DeviceTicketsPanel deviceId={deviceId} hostname={device.hostname} />
      ) : null}

      {tab === "remote" ? <RemotePanel deviceId={deviceId} /> : null}
      {tab === "terminal" ? <TerminalPanel deviceId={deviceId} /> : null}
      {tab === "files" ? <FileBrowserPanel deviceId={deviceId} /> : null}
      {tab === "services" ? <ServicesPanel deviceId={deviceId} /> : null}
      {tab === "activity" ? <ActivityPanel deviceId={deviceId} /> : null}

      {tab === "software" ? <SoftwareInventoryTab inventory={inventory} /> : null}

      {tab === "processes" ? (
        <ComingSoonTab
          title="Processes"
          description="This will show running processes, CPU/memory usage, owners, and safe terminate actions."
          items={[
            "Top CPU processes",
            "Top memory processes",
            "Process owner",
            "Executable path",
            "Start time",
            "Terminate process",
          ]}
        />
      ) : null}

      {tab === "patching" ? <UpdatesTab inventory={inventory} /> : null}

      {tab === "events" ? <EventHealthTab inventory={inventory} /> : null}

      {tab === "jobs" ? (
        <ComingSoonTab
          title="Device jobs"
          description="This will show commands and automation tasks sent to this device."
          items={[
            "Refresh inventory jobs",
            "Script runs",
            "Patch jobs",
            "Restart jobs",
            "Service actions",
            "File transfer jobs",
          ]}
        />
      ) : null}

      {![
        "overview",
        "hardware",
        "security",
        "storage",
        "network",
        "tickets",
        "remote",
        "terminal",
        "files",
        "services",
        "activity",
        "software",
        "processes",
        "patching",
        "events",
        "jobs",
      ].includes(tab) ? (
        <div className="hi5-panel p-5">
          <div className="text-lg font-semibold capitalize">{tab}</div>
          <p className="text-sm opacity-75 mt-2">This tab is coming soon.</p>
        </div>
      ) : null}
    </div>
  );
}
