import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

type TenantContext = {
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  me: { id: string } | null;
  tenant: { id: string; domain: string | null; subdomain: string | null; name: string | null } | null;
};

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

async function getContext(): Promise<TenantContext> {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user ? { id: userRes.user.id } : null;
  if (!me) return { supabase, me: null, tenant: null };

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (parsed.subdomain) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, name")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenant) return { supabase, me, tenant };
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.tenant_id) return { supabase, me, tenant: null };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name")
    .eq("id", membership.tenant_id)
    .maybeSingle();

  return { supabase, me, tenant: tenant ?? null };
}

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function GET(req: Request) {
  const { supabase, me, tenant } = await getContext();

  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = clean(url.searchParams.get("q"));
  const status = clean(url.searchParams.get("status"));
  const source = clean(url.searchParams.get("source"));

  let query = supabase
    .from("assets")
    .select(ASSET_SELECT)
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (source && source !== "all") {
    query = query.eq("source", source);
  }

  if (q) {
    query = query.or(
      [
        `name.ilike.%${q}%`,
        `hostname.ilike.%${q}%`,
        `serial_number.ilike.%${q}%`,
        `asset_tag.ilike.%${q}%`,
        `assigned_user_name.ilike.%${q}%`,
        `assigned_user_email.ilike.%${q}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, me, tenant } = await getContext();

  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = clean(body?.name);

  if (!name) {
    return NextResponse.json({ error: "Asset name required" }, { status: 400 });
  }

  const payload = {
    tenant_id: tenant.id,
    name,
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
    created_by: me.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("assets")
    .insert(payload)
    .select(ASSET_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ asset: data });
}
