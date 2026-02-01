// apps/app/src/app/api/admin/users/update-role/route.ts
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
  const role = String(body.role || "").trim();

  if (!membership_id || !role) {
    return NextResponse.json({ ok: false, error: "Missing membership_id or role" }, { status: 400 });
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
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = String(myMembership?.role || "");
  const isAdmin = myRole === "owner" || myRole === "admin";
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // Only allow safe roles
  const allowed = new Set(["owner", "admin", "user", "viewer", "agent"]);
  if (!allowed.has(role)) {
    return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
  }

  // Ensure membership belongs to this tenant
  const { data: target } = await supabase
    .from("memberships")
    .select("id, tenant_id, user_id")
    .eq("id", membership_id)
    .maybeSingle();

  if (!target || target.tenant_id !== tenant.id) {
    return NextResponse.json({ ok: false, error: "Membership not found for this tenant" }, { status: 404 });
  }

  const { error: updErr } = await supabase
    .from("memberships")
    .update({ role })
    .eq("id", membership_id);

  if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
