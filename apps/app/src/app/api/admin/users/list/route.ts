// apps/app/src/app/api/admin/users/list/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export async function GET(req: Request) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const host = getEffectiveHost(req.headers);
  const parsed = parseTenantHost(host);

  if (!parsed.subdomain) {
    return NextResponse.json({ ok: false, error: "Tenant subdomain required" }, { status: 400 });
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, is_active")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (tenantErr || !tenant) {
    return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  }

  // Admin check
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = String(myMembership?.role || "");
  const isAdmin = myRole === "owner" || myRole === "admin";
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // List users in tenant
  const { data: members, error: listErr } = await supabase
    .from("memberships")
    .select("id, user_id, role, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 400 });
  }

  const userIds = (members ?? []).map((m: any) => m.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds.length ? userIds : [""]);

  const byId = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

  const rows = (members ?? []).map((m: any) => {
    const p = byId.get(m.user_id);
    return {
      membership_id: m.id,
      user_id: m.user_id,
      email: p?.email ?? null,
      full_name: p?.full_name ?? null,
      role: m.role,
      created_at: m.created_at,
    };
  });

  return NextResponse.json({ ok: true, tenant: { id: tenant.id, domain: tenant.domain, subdomain: tenant.subdomain, name: tenant.name ?? null }, rows });
}
