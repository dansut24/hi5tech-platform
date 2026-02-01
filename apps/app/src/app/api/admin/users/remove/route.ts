// apps/app/src/app/api/admin/users/remove/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const membership_id = String(body.membership_id || "").trim();

  if (!membership_id) {
    return NextResponse.json({ ok: false, error: "Missing membership_id" }, { status: 400 });
  }

  const host = getEffectiveHost(req.headers);
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) return NextResponse.json({ ok: false, error: "Tenant subdomain required" }, { status: 400 });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });

  // Must be tenant admin
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("role, id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = String(myMembership?.role || "");
  const isAdmin = myRole === "owner" || myRole === "admin";
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // Ensure membership belongs to this tenant
  const { data: target } = await supabase
    .from("memberships")
    .select("id, tenant_id, user_id, role")
    .eq("id", membership_id)
    .maybeSingle();

  if (!target || target.tenant_id !== tenant.id) {
    return NextResponse.json({ ok: false, error: "Membership not found for this tenant" }, { status: 404 });
  }

  // Prevent self-removal accidentally
  if (target.user_id === user.id) {
    return NextResponse.json({ ok: false, error: "You can’t remove yourself." }, { status: 400 });
  }

  // Delete module assignments first, then membership
  await supabase.from("module_assignments").delete().eq("membership_id", membership_id);

  const { error: delErr } = await supabase.from("memberships").delete().eq("id", membership_id);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
