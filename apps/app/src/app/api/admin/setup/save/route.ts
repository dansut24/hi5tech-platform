import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const body = await req.json();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain)
    return NextResponse.json({ error: "Tenant not found" }, { status: 400 });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .single();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .single();

  if (!["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("tenant_settings").upsert(
    {
      tenant_id: tenant.id,
      company_name: body.company_name ?? null,
      support_email: body.support_email ?? null,
      timezone: body.timezone ?? "UTC",
      logo_url: body.logo_url ?? null,
      accent_hex: body.accent_hex ?? null,
      accent_2_hex: body.accent_2_hex ?? null,
      accent_3_hex: body.accent_3_hex ?? null,
      allowed_domains: body.allowed_domains ?? [],
      ms_enabled: body.ms_enabled ?? false,
      ms_tenant_id: body.ms_tenant_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
