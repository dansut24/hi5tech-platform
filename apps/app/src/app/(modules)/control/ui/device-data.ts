// apps/app/src/app/(modules)/control/ui/device-data.ts

/**
 * Raw shape returned by the platform/control device APIs.
 */
export interface DeviceApiRow {
  device_id: string;
  id?: string;
  tenant_id?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  enrollment_package_id?: string | null;
  hostname: string;
  name?: string;
  online?: boolean;
  status?: "online" | "offline" | "warning";
  os?: string;
  arch?: string;
  user?: string;
  ip?: string;
  last_seen_at?: string;
  last_seen?: string;
  lastSeen?: string;
  tags?: string[];
  agent_version?: string;
}

/**
 * Normalised device shape used throughout the Control UI.
 */
export interface DeviceRow {
  id: string;
  tenantId: string | null;
  groupId: string | null;
  groupName: string;
  enrollmentPackageId: string | null;
  name: string;
  status: "online" | "offline" | "warning";
  os: string;
  arch: string | null;
  user: string | null;
  ip: string | null;
  lastSeen: string;
  tags: string[];
  agentVersion: string | null;
}

export function toDeviceRow(raw: DeviceApiRow): DeviceRow {
  const id = raw.device_id ?? raw.id ?? "";

  let status: DeviceRow["status"] = raw.status ?? "offline";
  if (!raw.status) {
    status = raw.online === true ? "online" : "offline";
  }

  const groupId = raw.group_id ?? null;
  const groupName = raw.group_name || (groupId ? "Unassigned group" : "Default");

  return {
    id,
    tenantId: raw.tenant_id ?? null,
    groupId,
    groupName,
    enrollmentPackageId: raw.enrollment_package_id ?? null,
    name: raw.hostname ?? raw.name ?? id,
    status,
    os: raw.os ?? "Unknown",
    arch: raw.arch ?? null,
    user: raw.user ?? null,
    ip: raw.ip ?? null,
    lastSeen: raw.lastSeen ?? raw.last_seen ?? raw.last_seen_at ?? "—",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    agentVersion: raw.agent_version ?? null,
  };
}
