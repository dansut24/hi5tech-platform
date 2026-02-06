// apps/app/src/app/api/admin/setup/save/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

type Payload = {
  company_name?: string | null;
  support_email?: string | null;
  timezone?: string | null;
  logo_url?: string | null;
  accent_hex?: string | null;
  accent_2_hex?: string | null;
  accent_3_hex?: string | null;
  allowed_domains?: string[] | null;
  ms_enabled?: boolean | null;
  ms_tenant_id?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  // Must be logged in
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) return jsonError(userErr.message, 401);
  const user = userRes.user;
  if (!user) return jsonError("Unauthorized", 401);

  // Tenant from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) return jsonError("Tenant subdomain required", 400);

  const { data: tenant, error: tErr } = await supabase
    .from("tenants")
    .select("id, domain, subdomain")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (tErr) return jsonError(tErr.message, 400);
  if (!tenant) return jsonError("Tenant not found", 404);

  // Must be owner/admin
  const { data: membership, error: mErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mErr) return jsonError(mErr.message, 400);

  const role = String(membership?.role || "");
  const isAdmin = role === "owner" || role === "admin";
  if (!isAdmin) return jsonError("Forbidden", 403);

  // Body
  const body = (await req.json().catch(() => ({}))) as Payload;

  // Save draft settings (upsert by tenant_id)
  const update = {
    tenant_id: tenant.id,
    company_name: body.company_name ?? null,
    support_email: body.support_email ?? null,
    timezone: body.timezone ?? null,
    logo_url: body.logo_url ?? null,
    accent_hex: body.accent_hex ?? null,
    accent_2_hex: body.accent_2_hex ?? null,
    accent_3_hex: body.accent_3_hex ?? null,
    allowed_domains: body.allowed_domains ?? null,
    ms_enabled: body.ms_enabled ?? null,
    ms_tenant_id: body.ms_tenant_id ?? null,
    // IMPORTANT: this route is “save”, not “complete”
    onboarding_completed: false,
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase
    .from("tenant_settings")
    .upsert(update, { onConflict: "tenant_id" });

  if (upErr) return jsonError(upErr.message, 400);

  return NextResponse.json({ ok: true });
}
