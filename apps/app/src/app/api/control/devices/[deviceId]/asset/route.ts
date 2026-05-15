import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

type TenantContext = {
  me: { id: string } | null;
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
      return { me: { id: user.id }, tenantId: tenant.id };
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
    me: { id: user.id },
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
    .select("device_id, tenant_id, asset_id, hostname, os, arch, agent_version, online, last_seen_at, group_id")
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function loadInventory(tenantId: string, deviceId: string) {
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("device_inventory")
    .select("summary, hardware, os, security, network, collected_at")
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();

  return data ?? null;
}

function firstValue(obj: any, keys: string[], fallback: any = null) {
  if (!obj || typeof obj !== "object") return fallback;

  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }

  return fallback;
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
  const device = await loadDevice(tenantId, deviceId);

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  let linkedAsset = null;

  if (device.asset_id) {
    const { data } = await admin
      .from("assets")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", device.asset_id)
      .maybeSingle();

    linkedAsset = data ?? null;
  }

  if (!linkedAsset) {
    const { data } = await admin
      .from("assets")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("control_device_id", deviceId)
      .maybeSingle();

    linkedAsset = data ?? null;
  }

  const { data: candidates } = await admin
    .from("assets")
    .select("id, name, hostname, serial_number, asset_tag, assigned_user_name, assigned_user_email, source, status, control_device_id")
    .eq("tenant_id", tenantId)
    .eq("asset_type", "device")
    .order("updated_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    device,
    linkedAsset,
    candidates: candidates ?? [],
  });
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

  const admin = supabaseAdmin();
  const body = await req.json().catch(() => null);
  const action = clean(body?.action) || "create_from_device";

  const device = await loadDevice(tenantId, deviceId);

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  if (action !== "create_from_device") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const inventory = await loadInventory(tenantId, deviceId);
  const summary = (inventory as any)?.summary ?? {};
  const hardware = (inventory as any)?.hardware ?? {};
  const osInfo = (inventory as any)?.os ?? {};

  const hostname = firstValue(summary, ["hostname"], device.hostname);
  const manufacturer = firstValue(hardware, ["manufacturer", "vendor"]);
  const model = firstValue(hardware, ["model", "product"]);
  const serialNumber = firstValue(hardware, ["serial", "serial_number"]);
  const operatingSystem = firstValue(osInfo, ["name", "caption"], device.os);

  const assetName =
    clean(body?.name) ||
    hostname ||
    device.hostname ||
    `Device ${device.device_id}`;

  const { data: existing } = await admin
    .from("assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("control_device_id", deviceId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("devices")
      .update({ asset_id: existing.id })
      .eq("tenant_id", tenantId)
      .eq("device_id", deviceId);

    return NextResponse.json({ asset: existing, reused: true });
  }

  const { data: asset, error } = await admin
    .from("assets")
    .insert({
      tenant_id: tenantId,
      name: assetName,
      asset_type: "device",
      status: "active",
      source: "control",
      control_device_id: deviceId,
      hostname,
      operating_system: operatingSystem,
      manufacturer,
      model,
      serial_number: serialNumber,
      metadata: {
        control_device_id: deviceId,
        imported_from: "control_device",
        inventory_collected_at: (inventory as any)?.collected_at ?? null,
      },
      created_by: me.id,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("devices")
    .update({ asset_id: asset.id })
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId);

  return NextResponse.json({ asset, reused: false });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const body = await req.json().catch(() => null);
  const assetId = clean(body?.asset_id);

  if (!assetId) {
    return NextResponse.json({ error: "asset_id required" }, { status: 400 });
  }

  const device = await loadDevice(tenantId, deviceId);

  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const { data: asset, error: assetError } = await admin
    .from("assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", assetId)
    .maybeSingle();

  if (assetError) {
    return NextResponse.json({ error: assetError.message }, { status: 500 });
  }

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  await admin
    .from("assets")
    .update({
      control_device_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("control_device_id", deviceId);

  const { data: updatedAsset, error: updateAssetError } = await admin
    .from("assets")
    .update({
      control_device_id: deviceId,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", assetId)
    .select("*")
    .single();

  if (updateAssetError) {
    return NextResponse.json({ error: updateAssetError.message }, { status: 500 });
  }

  const { error: updateDeviceError } = await admin
    .from("devices")
    .update({ asset_id: assetId })
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId);

  if (updateDeviceError) {
    return NextResponse.json({ error: updateDeviceError.message }, { status: 500 });
  }

  return NextResponse.json({ asset: updatedAsset });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();

  await admin
    .from("assets")
    .update({
      control_device_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("control_device_id", deviceId);

  await admin
    .from("devices")
    .update({ asset_id: null })
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId);

  return NextResponse.json({ ok: true });
}
