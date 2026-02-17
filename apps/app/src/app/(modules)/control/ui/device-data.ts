// apps/app/src/app/(modules)/control/ui/device-data.ts

/**
 * The raw shape returned by the RMM API at /api/devices
 */
export interface DeviceApiRow {
  id: string;
  name: string;
  status: "online" | "offline" | "warning";
  os?: string;
  user?: string;
  ip?: string;
  last_seen?: string;
  lastSeen?: string;
  tags?: string[];
}

/**
 * Normalised device shape used throughout the Control UI
 */
export interface DeviceRow {
  id: string;
  name: string;
  status: "online" | "offline" | "warning";
  os: string;
  user: string | null;
  ip: string | null;
  lastSeen: string;
  tags: string[];
}

/**
 * Maps a raw API row to the normalised DeviceRow used by the UI.
 */
export function toDeviceRow(raw: DeviceApiRow): DeviceRow {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status ?? "offline",
    os: raw.os ?? "Unknown",
    user: raw.user ?? null,
    ip: raw.ip ?? null,
    lastSeen: raw.lastSeen ?? raw.last_seen ?? "—",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}
