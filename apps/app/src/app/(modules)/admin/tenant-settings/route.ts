import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

async function getContext() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) return { supabase, me: null, tenant: null, role: null };

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) return { supabase, me, tenant: null, role: null };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) return { supabase, me, tenant: null, role: null };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", me.id)
    .maybeSingle();

  const role = String(membership?.role || "");
  return { supabase, me, tenant, role };
}

function isAdminRole(role: string | null) {
  return role === "owner" || role === "admin";
}

export async function GET() {
  const { supabase, me, tenant, role } = await getContext();
  if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!tenant) return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  if (!isAdminRole(role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, tenant, settings: data ?? null });
}

export async function POST(req: Request) {
  const { supabase, me, tenant, role } = await getContext();
  if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!tenant) return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  if (!isAdminRole(role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));

  // Only accept known keys (avoid accidental overwrites)
  const patch: any = {
    tenant_id: tenant.id,

    company_name: body.company_name ?? undefined,
    support_email: body.support_email ?? undefined,
    timezone: body.timezone ?? undefined,
    logo_url: body.logo_url ?? undefined,

    accent_hex: body.accent_hex ?? undefined,
    accent_2_hex: body.accent_2_hex ?? undefined,
    accent_3_hex: body.accent_3_hex ?? undefined,

    allowed_domains: body.allowed_domains ?? undefined,

    ms_enabled: body.ms_enabled ?? undefined,
    ms_tenant_id: body.ms_tenant_id ?? undefined,
    ms_connected_at: body.ms_connected_at ?? undefined,

    onboarding_completed: body.onboarding_completed ?? undefined,
    onboarding_completed_at: body.onboarding_completed ? new Date().toISOString() : undefined,
  };

  // Remove undefined keys so upsert doesn’t null things unintentionally
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { data, error } = await supabase
    .from("tenant_settings")
    .upsert(patch, { onConflict: "tenant_id" })
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, tenant, settings: data ?? null });
}
