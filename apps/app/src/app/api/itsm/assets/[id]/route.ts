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

function cleanDate(value: unknown) {
  const text = clean(value);
  if (!text) return null;

  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;

  return text;
}

function normalizeAssetStatus(value: unknown) {
  const v = String(value ?? "").trim().toLowerCase();

  if (v === "active") return "active";
  if (v === "spare") return "spare";
  if (v === "retired") return "retired";
  if (v === "lost") return "lost";
  if (v === "disposed") return "retired";

  return "active";
}

async function loadAsset(tenantId: string, assetId: string) {
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("assets")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const asset = await loadAsset(tenantId, id);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ asset });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { me, tenantId } = await getTenantContext();

  if (!me || !tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = clean(body?.action);

  const admin = supabaseAdmin();

  const existing = await loadAsset(tenantId, id);

  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (action === "unlink_control_device") {
    const previousDeviceId = existing.control_device_id;

    const { data: asset, error } = await admin
      .from("assets")
      .update({
        control_device_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (previousDeviceId) {
      await admin
        .from("devices")
        .update({ asset_id: null })
        .eq("tenant_id", tenantId)
        .eq("device_id", previousDeviceId)
        .then(() => null);
    }

    return NextResponse.json({ asset });
  }

  if (action === "retire") {
    const { data: asset, error } = await admin
      .from("assets")
      .update({
        status: "retired",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset });
  }

  const updatePayload: Record<string, any> = {
    name: clean(body?.name),
    hostname: clean(body?.hostname),
    serial_number: clean(body?.serial_number),
    asset_tag: clean(body?.asset_tag),
    manufacturer: clean(body?.manufacturer),
    model: clean(body?.model),
    operating_system: clean(body?.operating_system),
    assigned_user_name: clean(body?.assigned_user_name),
    assigned_user_email: clean(body?.assigned_user_email),
    department: clean(body?.department),
    location: clean(body?.location),
    warranty_status: clean(body?.warranty_status),
    warranty_expires_at: cleanDate(body?.warranty_expires_at),
    status: normalizeAssetStatus(body?.status),
    notes: clean(body?.notes),
    updated_at: new Date().toISOString(),
  };

  if (!updatePayload.name) {
    return NextResponse.json({ error: "Asset name is required" }, { status: 400 });
  }

  const { data: asset, error } = await admin
    .from("assets")
    .update(updatePayload)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ asset });
}
