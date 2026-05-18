import Link from "next/link";
import { Monitor } from "lucide-react";
import DeviceLinkerClient from "./DeviceLinkerClient";

type Device = {
  device_id: string;
  tenant_id: string;
  hostname?: string | null;
  os?: string | null;
  arch?: string | null;
  online?: boolean | null;
  last_seen_at?: string | null;
  updated_at?: string | null;
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

export default function DeviceContextCard({
  incidentId,
  tenantId,
  device,
  features,
}: {
  incidentId: string;
  tenantId: string;
  device: Device | null;
  features: {
    devices_inventory?: boolean;
    remote_control?: boolean;
    remote_terminal?: boolean;
    remote_files?: boolean;
  };
}) {
  const deviceId = device?.device_id ?? null;
  const name = device?.hostname || device?.device_id || "No linked device";

  const visibleActions = deviceId
    ? [
        features.devices_inventory
          ? {
              key: "inventory",
              href: `/control/devices/${encodeURIComponent(deviceId)}`,
              label: "Full device",
              className: "hi5-btn-ghost text-sm w-full",
            }
          : null,
        features.remote_control
          ? {
              key: "remote",
              href: `/control/devices/${encodeURIComponent(deviceId)}?tab=remote`,
              label: "Remote",
              className: "hi5-btn-primary text-sm w-full",
            }
          : null,
        features.remote_terminal
          ? {
              key: "terminal",
              href: `/control/devices/${encodeURIComponent(deviceId)}?tab=terminal`,
              label: "Terminal",
              className: "hi5-btn-ghost text-sm w-full",
            }
          : null,
        features.remote_files
          ? {
              key: "files",
              href: `/control/devices/${encodeURIComponent(deviceId)}?tab=files`,
              label: "Files",
              className: "hi5-btn-ghost text-sm w-full",
            }
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="hi5-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Linked device
          </div>
          <p className="text-xs opacity-70 mt-1">
            Device context is included with ITSM. Remote tools appear here only when enabled for this workspace and environment.
          </p>
        </div>

        {device ? (
          <span
            className={[
              "rounded-full px-2 py-0.5 text-xs border",
              device.online
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "hi5-border opacity-70",
            ].join(" ")}
          >
            {device.online ? "Online" : "Offline"}
          </span>
        ) : null}
      </div>

      {device ? (
        <div className="rounded-2xl border hi5-border hi5-card p-4">
          <div className="font-semibold truncate">{name}</div>
          <div className="text-xs opacity-70 mt-1">
            {device.os || "OS unknown"} {device.arch ? `• ${device.arch}` : ""}
          </div>
          <div className="text-xs opacity-70 mt-1">
            Device ID: <span className="font-mono">{device.device_id}</span>
          </div>
          <div className="text-xs opacity-70 mt-1">
            Last seen: {fmt(device.last_seen_at)}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border hi5-border hi5-card p-4 text-sm opacity-75">
          No device is linked to this incident yet.
        </div>
      )}

      <DeviceLinkerClient
        incidentId={incidentId}
        tenantId={tenantId}
        currentDeviceId={deviceId}
      />

      {visibleActions.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {visibleActions.map((action: any) => (
            <Link key={action.key} href={action.href} className={action.className}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
