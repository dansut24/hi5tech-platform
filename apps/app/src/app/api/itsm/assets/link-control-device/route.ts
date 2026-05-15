import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

async function getTenantContext() {
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

export async function GET(req: Request) {
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const assetId = clean(url.searchParams.get("asset_id"));

  if (!assetId) {
    return NextResponse.json({ error: "asset_id required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

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

  let linkedDevice = null;

  if (asset.control_device_id) {
    const { data } = await admin
      .from("devices")
      .select("device_id, hostname, os, arch, agent_version, online, last_seen_at, group_id, asset_id")
      .eq("tenant_id", tenantId)
      .eq("device_id", asset.control_device_id)
      .maybeSingle();

    linkedDevice = data ?? null;
  }

  const { data: devices } = await admin
    .from("devices")
    .select("device_id, hostname, os, arch, agent_version, online, last_seen_at, group_id, asset_id")
    .eq("tenant_id", tenantId)
    .order("last_seen_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    asset,
    linkedDevice,
    devices: devices ?? [],
  });
}

export async function POST(req: Request) {
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const assetId = clean(body?.asset_id);
  const deviceId = clean(body?.device_id);

  if (!assetId) {
    return NextResponse.json({ error: "asset_id required" }, { status: 400 });
  }

  if (!deviceId) {
    return NextResponse.json({ error: "device_id required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

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

  const { data: device, error: deviceError } = await admin
    .from("devices")
    .select("device_id, tenant_id, asset_id, hostname, os, online, last_seen_at")
    .eq("tenant_id", tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (deviceError) {
    return NextResponse.json({ error: deviceError.message }, { status: 500 });
  }

  if (!device) {
    return NextResponse.json({ error: "Control device not found" }, { status: 404 });
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

  return NextResponse.json({
    asset: updatedAsset,
    device,
  });
}

export async function DELETE(req: Request) {
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const assetId = clean(body?.asset_id);

  if (!assetId) {
    return NextResponse.json({ error: "asset_id required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: asset } = await admin
    .from("assets")
    .select("id, control_device_id")
    .eq("tenant_id", tenantId)
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (asset.control_device_id) {
    await admin
      .from("devices")
      .update({ asset_id: null })
      .eq("tenant_id", tenantId)
      .eq("device_id", asset.control_device_id);
  }

  await admin
    .from("assets")
    .update({
      control_device_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", assetId);

  return NextResponse.json({ ok: true });
}
