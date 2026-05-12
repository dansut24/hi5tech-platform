import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const UPSTREAM_BASE = "https://rmm.hi5tech.co.uk/api/devices";

type UpstreamDevice = {
  device_id?: string;
  id?: string;
  tenant_id?: string;
  group_id?: string | null;
  group_name?: string | null;
  enrollment_package_id?: string | null;
  hostname?: string;
  name?: string;
  os?: string;
  arch?: string;
  agent_version?: string;
  user?: string;
  ip?: string;
  tags?: string[];
  last_seen_at?: string;
  online?: boolean;
};

type LocalDevice = {
  device_id: string;
  group_id: string | null;
  enrollment_package_id?: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  slug?: string | null;
};

async function resolveTenant(req: Request) {
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const url = new URL(req.url);
  const requestedTenantId = url.searchParams.get("tenant_id") ?? req.headers.get("X-Tenant-ID");

  const memberTenantIds = await getMemberTenantIds();

  if (!memberTenantIds.length) {
    return { error: NextResponse.json({ error: "No tenant membership found" }, { status: 403 }) };
  }

  if (requestedTenantId && !memberTenantIds.includes(requestedTenantId)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    user,
    tenantId: requestedTenantId ?? memberTenantIds[0],
  };
}

async function syncDevicesToSupabase(tenantId: string, devices: UpstreamDevice[]) {
  const admin = supabaseAdmin();

  const rows = devices
    .map((d) => ({
      device_id: String(d.device_id ?? d.id ?? "").trim(),
      tenant_id: String(d.tenant_id || tenantId),
      group_id: d.group_id ?? null,
      enrollment_package_id: d.enrollment_package_id ?? null,
      hostname: d.hostname ?? d.name ?? null,
      os: d.os ?? null,
      arch: d.arch ?? null,
      agent_version: d.agent_version ?? null,
      online: d.online === true,
      last_seen_at: d.last_seen_at ?? null,
      updated_at: new Date().toISOString(),
    }))
    .filter((d) => d.device_id.length > 0 && d.tenant_id === tenantId);

  if (!rows.length) return;

  const { error } = await admin
    .from("devices")
    .upsert(rows, {
      onConflict: "device_id",
    });

  if (error) {
    console.error("[control/devices] Supabase sync failed:", error.message);
  }
}

async function loadLocalDeviceGroups(tenantId: string) {
  const admin = supabaseAdmin();

  const [{ data: localDevices }, { data: groups }] = await Promise.all([
    admin
      .from("devices")
      .select("device_id, group_id, enrollment_package_id")
      .eq("tenant_id", tenantId),
    admin
      .from("device_groups")
      .select("id, name, slug")
      .eq("tenant_id", tenantId)
      .is("archived_at", null),
  ]);

  const deviceById = new Map<string, LocalDevice>();
  for (const d of (localDevices ?? []) as LocalDevice[]) {
    if (d.device_id) deviceById.set(d.device_id, d);
  }

  const groupById = new Map<string, GroupRow>();
  for (const g of (groups ?? []) as GroupRow[]) {
    groupById.set(g.id, g);
    if (g.slug) groupById.set(g.slug, g);
  }

  return { deviceById, groupById };
}

function enrichDevices(
  tenantId: string,
  devices: UpstreamDevice[],
  deviceById: Map<string, LocalDevice>,
  groupById: Map<string, GroupRow>
) {
  return devices
    .map((d) => {
      const deviceId = String(d.device_id ?? d.id ?? "").trim();
      const local = deviceById.get(deviceId);
      const rawGroupId = d.group_id ?? local?.group_id ?? null;
      const group = rawGroupId ? groupById.get(rawGroupId) : null;
      const groupId = group?.slug === "default" ? null : rawGroupId;

      return {
        ...d,
        device_id: deviceId,
        tenant_id: d.tenant_id ?? tenantId,
        group_id: groupId,
        group_name: d.group_name ?? group?.name ?? (groupId ? "Unknown group" : "Default"),
        enrollment_package_id: d.enrollment_package_id ?? local?.enrollment_package_id ?? null,
      };
    })
    .filter((d) => d.device_id);
}

export async function GET(req: Request) {
  const resolved = await resolveTenant(req);
  if ("error" in resolved) return resolved.error;

  let upstreamRes: Response;

  try {
    upstreamRes = await fetch(`${UPSTREAM_BASE}?tenant_id=${encodeURIComponent(resolved.tenantId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Tenant-ID": resolved.tenantId,
        "X-User-ID": resolved.user.id,
      },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[control/devices/list] upstream fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach device service" }, { status: 502 });
  }

  const json = await upstreamRes.json().catch(() => null);

  if (!upstreamRes.ok) {
    return NextResponse.json(json ?? { error: "Device service error" }, { status: upstreamRes.status });
  }

  const devices = Array.isArray(json) ? json : Array.isArray(json?.devices) ? json.devices : [];

  await syncDevicesToSupabase(resolved.tenantId, devices);

  const { deviceById, groupById } = await loadLocalDeviceGroups(resolved.tenantId);
  const enriched = enrichDevices(resolved.tenantId, devices, deviceById, groupById);

  return NextResponse.json(enriched, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
