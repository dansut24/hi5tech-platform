// apps/app/src/app/api/admin/onboarding/complete/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  // Must be logged in
  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user;
  if (!me) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Tenant from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) {
    return NextResponse.json({ ok: false, error: "Tenant subdomain required" }, { status: 400 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  }

  // Must be owner/admin
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", me.id)
    .maybeSingle();

  const role = String(membership?.role || "");
  const isAdmin = role === "owner" || role === "admin";
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Mark onboarding completed (upsert so it works even if tenant_settings row doesn’t exist)
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tenant_settings")
    .upsert(
      {
        tenant_id: tenant.id,
        onboarding_completed: true,
        onboarding_completed_at: now,
        updated_at: now,
      },
      { onConflict: "tenant_id" }
    );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tenant_id: tenant.id });
}
