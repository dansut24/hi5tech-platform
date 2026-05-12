import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import { controlServerJson } from "@/lib/control-server";

export const dynamic = "force-dynamic";

async function getContext() {
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

export async function POST(req: Request) {
  const { supabase, me, tenant } = await getContext();
  if (!me || !tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const revokedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("enrollment_packages")
    .update({ status: "revoked", revoked_at: revokedAt, revoked_by: me.id })
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .select("id, tenant_id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  let syncWarning: string | null = null;
  try {
    await controlServerJson("/api/enrollment-packages/revoke", {
      method: "POST",
      body: JSON.stringify({ id, tenant_id: tenant.id, revoked_at: revokedAt }),
    });
  } catch (err) {
    syncWarning = err instanceof Error ? err.message : "Failed to sync revoke to control server";
  }

  return NextResponse.json({ ok: true, package: data, sync_warning: syncWarning });
}
