import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import { getTenantFeatures } from "@/lib/entitlements";

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

async function loadIncident(tenantId: string, incidentId: string) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("incidents")
    .select("id, tenant_id, asset_id")
    .eq("tenant_id", tenantId)
    .eq("id", incidentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function loadAssetWithDevice(tenantId: string, assetId: string | null) {
  if (!assetId) {
    return { asset: null, linkedDevice: null };
  }

  const admin = supabaseAdmin();

  const { data: asset, error: assetError } = await admin
    .from("assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", assetId)
    .maybeSingle();

  if (assetError) {
    throw new Error(assetError.message);
  }

  let linkedDevice = null;

  if (asset?.control_device_id) {
    const { data } = await admin
      .from("devices")
      .select("device_id, hostname, os, arch, agent_version, online, last_seen_at, group_id, asset_id")
      .eq("tenant_id", tenantId)
      .eq("device_id", asset.control_device_id)
      .maybeSingle();

    linkedDevice = data ?? null;
  }

  return {
    asset: asset ?? null,
    linkedDevice,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: incidentId } = await params;
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();

  const incident = await loadIncident(tenantId, incidentId);

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const { asset, linkedDevice } = await loadAssetWithDevice(
    tenantId,
    incident.asset_id ?? null
  );

  const { data: candidates, error: candidatesError } = await admin
    .from("assets")
    .select(
      "id, name, hostname, serial_number, asset_tag, manufacturer, model, operating_system, assigned_user_name, assigned_user_email, department, location, source, status, control_device_id"
    )
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  const features = await getTenantFeatures(tenantId).catch(() => null);

  return NextResponse.json({
    incident,
    asset,
    linkedDevice,
    candidates: candidates ?? [],
    features: {
      control_enabled:
        features?.devices_inventory === true ||
        features?.remote_control === true ||
        features?.remote_terminal === true ||
        features?.remote_files === true,
      devices_inventory: features?.devices_inventory === true,
      remote_control: features?.remote_control === true,
      remote_terminal: features?.remote_terminal === true,
      remote_files: features?.remote_files === true,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: incidentId } = await params;
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

  const incident = await loadIncident(tenantId, incidentId);

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
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

  const { data: updatedIncident, error: updateError } = await admin
    .from("incidents")
    .update({
      asset_id: assetId,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", incidentId)
    .select("id, tenant_id, asset_id")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const linked = await loadAssetWithDevice(tenantId, assetId);

  return NextResponse.json({
    incident: updatedIncident,
    asset: linked.asset,
    linkedDevice: linked.linkedDevice,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: incidentId } = await params;
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();

  const incident = await loadIncident(tenantId, incidentId);

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("incidents")
    .update({
      asset_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", incidentId)
    .select("id, tenant_id, asset_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ incident: data });
}
