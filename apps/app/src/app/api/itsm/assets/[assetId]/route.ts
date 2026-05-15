import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

const ASSET_SELECT = `
  id,
  tenant_id,
  name,
  asset_type,
  status,
  source,
  external_id,
  control_device_id,
  serial_number,
  asset_tag,
  manufacturer,
  model,
  hostname,
  operating_system,
  assigned_user_name,
  assigned_user_email,
  department,
  location,
  warranty_status,
  warranty_expires_at,
  notes,
  metadata,
  created_by,
  created_at,
  updated_at
`;

async function getTenantId() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) return { supabase, tenantId: null };

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (parsed.subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenant?.id) return { supabase, tenantId: tenant.id };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { supabase, tenantId: membership?.tenant_id ?? null };
}

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const { supabase, tenantId } = await getTenantId();

  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .select(ASSET_SELECT)
    .eq("tenant_id", tenantId)
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  let linkedDevice = null;

  if (asset.control_device_id) {
    const { data } = await supabase
      .from("devices")
      .select("device_id, hostname, os, arch, agent_version, online, last_seen_at, group_id")
      .eq("tenant_id", tenantId)
      .eq("device_id", asset.control_device_id)
      .maybeSingle();

    linkedDevice = data ?? null;
  }

  return NextResponse.json({ asset, linkedDevice });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const { supabase, tenantId } = await getTenantId();

  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const patch = {
    name: clean(body?.name),
    asset_type: clean(body?.asset_type) || "device",
    status: clean(body?.status) || "active",
    source: clean(body?.source) || "manual",
    external_id: clean(body?.external_id),
    control_device_id: clean(body?.control_device_id),
    serial_number: clean(body?.serial_number),
    asset_tag: clean(body?.asset_tag),
    manufacturer: clean(body?.manufacturer),
    model: clean(body?.model),
    hostname: clean(body?.hostname),
    operating_system: clean(body?.operating_system),
    assigned_user_name: clean(body?.assigned_user_name),
    assigned_user_email: clean(body?.assigned_user_email),
    department: clean(body?.department),
    location: clean(body?.location),
    warranty_status: clean(body?.warranty_status),
    warranty_expires_at: clean(body?.warranty_expires_at),
    notes: clean(body?.notes),
    metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
    updated_at: new Date().toISOString(),
  };

  if (!patch.name) {
    return NextResponse.json({ error: "Asset name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("assets")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", assetId)
    .select(ASSET_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}
