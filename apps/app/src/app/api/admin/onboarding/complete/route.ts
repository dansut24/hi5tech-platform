// apps/app/src/app/api/admin/onboarding/complete/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await supabaseServer();

  // Must be logged in
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Tenant from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) {
    return NextResponse.json({ ok: false, error: "Tenant subdomain required" }, { status: 400 });
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, domain, subdomain")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (tenantErr || !tenant) {
    return NextResponse.json(
      { ok: false, error: tenantErr?.message ?? "Tenant not found" },
      { status: 404 }
    );
  }

  // Must be owner/admin
  const { data: membership, error: memErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    return NextResponse.json({ ok: false, error: memErr.message }, { status: 400 });
  }

  const role = String(membership?.role || "");
  const isAdmin = role === "owner" || role === "admin";
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Mark onboarding complete (idempotent)
  const now = new Date().toISOString();
  const { error: upsertErr } = await supabase.from("tenant_settings").upsert(
    {
      tenant_id: tenant.id,
      onboarding_completed: true,
      onboarding_completed_at: now,
      updated_at: now,
    },
    { onConflict: "tenant_id" }
  );

  if (upsertErr) {
    return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
