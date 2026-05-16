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

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

async function loadDevice(tenantId: string, deviceId: string) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("devices")
    .select(
      "device_id, tenant_id, asset_id, hostname, os, arch, agent_version, online, last_seen_at, group_id"
    )
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findLinkedAsset(tenantId: string, device: any) {
  const admin = supabaseAdmin();

  if (device?.asset_id) {
    const { data } = await admin
      .from("assets")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", device.asset_id)
      .maybeSingle();

    if (data) return data;
  }

  const { data } = await admin
    .from("assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("control_device_id", device.device_id)
    .maybeSingle();

  return data ?? null;
}

async function createAssetFromDevice(tenantId: string, userId: string, device: any) {
  const admin = supabaseAdmin();

  const existing = await findLinkedAsset(tenantId, device);
  if (existing) return existing;

  const assetName = device.hostname || `Device ${device.device_id}`;

  const { data: asset, error } = await admin
    .from("assets")
    .insert({
      tenant_id: tenantId,
      name: assetName,
      asset_type: "device",
      status: "active",
      source: "control",
      control_device_id: device.device_id,
      hostname: device.hostname,
      operating_system: device.os,
      metadata: {
        control_device_id: device.device_id,
        created_from: "control_create_ticket",
      },
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await admin
    .from("devices")
    .update({ asset_id: asset.id })
    .eq("tenant_id", tenantId)
    .eq("device_id", device.device_id);

  return asset;
}

function buildDescription(device: any, bodyDescription?: string | null) {
  const lines = [
    bodyDescription || "Ticket created from Hi5Tech Control device page.",
    "",
    "Device context:",
    `- Device ID: ${device.device_id}`,
    `- Hostname: ${device.hostname || "Unknown"}`,
    `- OS: ${device.os || "Unknown"}`,
    `- Architecture: ${device.arch || "Unknown"}`,
    `- Agent version: ${device.agent_version || "Unknown"}`,
    `- Online: ${device.online ? "Yes" : "No"}`,
    `- Last seen: ${device.last_seen_at || "Unknown"}`,
  ];

  return lines.join("\n");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const title = clean(body?.title);
  const description = clean(body?.description);
  const priority = clean(body?.priority) || "medium";
  const category = clean(body?.category) || "Device";
  const createAssetIfMissing = body?.create_asset_if_missing !== false;

  const admin = supabaseAdmin();

  const device = await loadDevice(tenantId, deviceId);

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  let linkedAsset = await findLinkedAsset(tenantId, device);

  if (!linkedAsset && createAssetIfMissing) {
    linkedAsset = await createAssetFromDevice(tenantId, me.id, device);
  }

  const incidentTitle =
    title ||
    `Issue with ${device.hostname || device.device_id}`;

  const payload: Record<string, any> = {
    tenant_id: tenantId,
    title: incidentTitle,
    description: buildDescription(device, description),
    category,
    status: "open",
    priority,
    triage_status: "new",
    device_id: device.device_id,
    asset_id: linkedAsset?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: incident, error } = await admin
    .from("incidents")
    .insert(payload)
    .select("id, number, tenant_id, title, asset_id, device_id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("itsm_activity")
    .insert({
      tenant_id: tenantId,
      entity_type: "incident",
      entity_id: incident.id,
      activity_type: "created_from_control",
      title: "Incident created from Control device",
      body: `Created from Control device ${device.hostname || device.device_id}.`,
      created_by: me.id,
    })
    .then(() => null);

  return NextResponse.json({
    incident,
    asset: linkedAsset,
    device,
    redirect_to: `/itsm/incidents/${encodeURIComponent(incident.number || incident.id)}`,
  });
}
