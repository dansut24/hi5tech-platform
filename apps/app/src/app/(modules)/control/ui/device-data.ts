// apps/app/src/app/(modules)/control/ui/device-data.ts

export type DeviceApiRow = {
  device_id: string;
  hostname: string;
  os: string;
  arch: string;
  last_seen_at: string; // ISO
  online: boolean;
};

export type DeviceRow = {
  id: string;
  name: string;
  status: "online" | "offline" | "warning";
  os: string;
  lastSeen: string;
  user?: string;
  tags: string[];
  ip?: string;
  lastSeenAt?: string;
};

export function toDeviceRow(d: DeviceApiRow): DeviceRow {
  return {
    id: d.device_id,
    name: d.hostname || d.device_id,
    status: d.online ? "online" : "offline",
    os: d.os || "Unknown",
    lastSeen: d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "—",
    tags: [],
    lastSeenAt: d.last_seen_at,
  };
}
