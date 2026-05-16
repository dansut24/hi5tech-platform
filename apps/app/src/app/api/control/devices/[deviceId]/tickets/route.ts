import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

type TenantContext = {
  me: { id: string; email?: string | null } | null;
  tenantId: string | null;
};

async function getTenantContext(): Promise<TenantContext> {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    return { me: null, tenantId: null };
  }

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (parsed.subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenant?.id) {
      return {
        me: { id: user.id, email: user.email },
        tenantId: tenant.id,
      };
    }
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    me: { id: user.id, email: user.email },
    tenantId: membership?.tenant_id ?? null,
  };
}

async function loadDeviceAndAsset(tenantId: string, deviceId: string) {
  const admin = supabaseAdmin();

  const { data: device, error: deviceError } = await admin
    .from("devices")
    .select("device_id, tenant_id, asset_id, hostname, os, online, last_seen_at")
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (deviceError) {
    throw new Error(deviceError.message);
  }

  if (!device) {
    return { device: null, asset: null };
  }

  let asset = null;

  if (device.asset_id) {
    const { data } = await admin
      .from("assets")
      .select("id, name, hostname, control_device_id")
      .eq("tenant_id", tenantId)
      .eq("id", device.asset_id)
      .maybeSingle();

    asset = data ?? null;
  }

  if (!asset) {
    const { data } = await admin
      .from("assets")
      .select("id, name, hostname, control_device_id")
      .eq("tenant_id", tenantId)
      .eq("control_device_id", device.device_id)
      .maybeSingle();

    asset = data ?? null;
  }

  return { device, asset };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();

  const { device, asset } = await loadDeviceAndAsset(tenantId, deviceId);

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  let query = admin
    .from("incidents")
    .select(
      [
        "id",
        "number",
        "title",
        "status",
        "priority",
        "triage_status",
        "category",
        "asset_id",
        "device_id",
        "created_at",
        "updated_at",
        "sla_due",
        "is_breached",
      ].join(",")
    )
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (asset?.id) {
    query = query.or(`device_id.eq.${device.device_id},asset_id.eq.${asset.id}`);
  } else {
    query = query.eq("device_id", device.device_id);
  }

  const { data: incidents, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const openCount = (incidents ?? []).filter((ticket: any) =>
    ["Open", "In Progress"].includes(String(ticket.status || ""))
  ).length;

  const breachedCount = (incidents ?? []).filter((ticket: any) => ticket.is_breached === true).length;

  return NextResponse.json({
    device,
    asset,
    incidents: incidents ?? [],
    summary: {
      total: incidents?.length ?? 0,
      open: openCount,
      breached: breachedCount,
    },
  });
}
