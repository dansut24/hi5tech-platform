import Link from "next/link";
import { FolderOpen, Monitor, ScreenShare, Terminal } from "lucide-react";
import DeviceLinkerClient from "./DeviceLinkerClient";
import PremiumFeatureLock from "@/components/premium/PremiumFeatureLock";

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

  return (
    <div className="hi5-panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Linked device
          </div>
          <p className="text-xs opacity-70 mt-1">
            Device context is included with ITSM. Remote tools are premium.
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

      {deviceId ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {features.devices_inventory ? (
            <Link href={`/control/${deviceId}`} className="hi5-btn-ghost text-sm w-full">
              Full device
            </Link>
          ) : (
            <PremiumFeatureLock
              tenantId={tenantId}
              incidentId={incidentId}
              deviceId={deviceId}
              featureKey="devices_inventory"
              label="Full inventory"
            />
          )}

          {features.remote_control ? (
            <Link href={`/control/${deviceId}?tab=remote`} className="hi5-btn-primary text-sm w-full">
              Remote
            </Link>
          ) : (
            <PremiumFeatureLock
              tenantId={tenantId}
              incidentId={incidentId}
              deviceId={deviceId}
              featureKey="remote_control"
              label="Remote"
              className="hi5-btn-primary text-sm w-full"
            />
          )}

          {features.remote_terminal ? (
            <Link href={`/control/${deviceId}?tab=terminal`} className="hi5-btn-ghost text-sm w-full">
              Terminal
            </Link>
          ) : (
            <PremiumFeatureLock
              tenantId={tenantId}
              incidentId={incidentId}
              deviceId={deviceId}
              featureKey="remote_terminal"
              label="Terminal"
            />
          )}

          {features.remote_files ? (
            <Link href={`/control/${deviceId}?tab=files`} className="hi5-btn-ghost text-sm w-full">
              Files
            </Link>
          ) : (
            <PremiumFeatureLock
              tenantId={tenantId}
              incidentId={incidentId}
              deviceId={deviceId}
              featureKey="remote_files"
              label="Files"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
