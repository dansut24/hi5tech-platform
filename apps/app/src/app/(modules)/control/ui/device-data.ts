// apps/app/src/app/(modules)/control/ui/device-data.ts

/**
 * The raw shape returned by the Go RMM server at GET /api/devices.
 *
 * The Go server serialises rows like this:
 *   { device_id, hostname, os, arch, agent_version, last_seen_at, online }
 *
 * Note: the primary key is "device_id" (NOT "id"), and the display name is
 * "hostname" (NOT "name"). Status is derived from the boolean "online" field.
 */
export interface DeviceApiRow {
  device_id: string;       // primary key from Go API
  id?: string;             // fallback if a future version renames the field
  hostname: string;        // display name from Go API
  name?: string;           // fallback
  online?: boolean;        // Go API status field (boolean)
  status?: "online" | "offline" | "warning"; // optional override
  os?: string;
  arch?: string;
  user?: string;
  ip?: string;
  last_seen_at?: string;   // Go API timestamp field
  last_seen?: string;      // alternative naming
  lastSeen?: string;       // camelCase alternative
  tags?: string[];
  agent_version?: string;
}

/**
 * Normalised device shape used throughout the Control UI.
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
 * Maps a raw API row from the Go control server to the normalised DeviceRow.
 *
 * Key mappings:
 *   device_id    -> id         (Go uses "device_id" not "id")
 *   hostname     -> name       (Go uses "hostname" not "name")
 *   online       -> status     (Go uses a boolean, not a string union)
 *   last_seen_at -> lastSeen
 */
export function toDeviceRow(raw: DeviceApiRow): DeviceRow {
  const id = raw.device_id ?? raw.id ?? "";

  // Go API returns a boolean "online" field. Map it to the status union.
  // Explicit "status" string (e.g. "warning") takes priority if present.
  let status: DeviceRow["status"] = raw.status ?? "offline";
  if (!raw.status) {
    status = raw.online === true ? "online" : "offline";
  }

  return {
    id,
    name: raw.hostname ?? raw.name ?? id,
    status,
    os: raw.os ?? "Unknown",
    user: raw.user ?? null,
    ip: raw.ip ?? null,
    lastSeen: raw.lastSeen ?? raw.last_seen ?? raw.last_seen_at ?? "—",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}
