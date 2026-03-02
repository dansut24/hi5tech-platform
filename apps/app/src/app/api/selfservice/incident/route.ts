// apps/app/src/app/api/selfservice/incident/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  title?: string;
  description?: string;
  priority?: string;
};

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function getBearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearer(req);
    if (!token) return json(401, { error: "Not authenticated (missing token)" });

    const host = (req.headers.get("host") || "").toLowerCase();
    const parsed = parseTenantHost(host);

    if (!parsed.subdomain || !parsed.rootDomain) {
      return json(400, { error: "No tenant context (missing subdomain)" });
    }

    const { title, description, priority } = (await req.json().catch(() => ({}))) as Body;

    const cleanTitle = String(title || "").trim();
    const cleanDesc = String(description || "").trim();
    const cleanPriority = String(priority || "medium").toLowerCase();

    if (!cleanTitle) return json(400, { error: "Title is required" });
    if (!cleanDesc) return json(400, { error: "Description is required" });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      return json(500, { error: "Server missing SUPABASE_SERVICE_ROLE_KEY" });
    }

    // 1) Verify user from token (no cookies required)
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes.user) {
      return json(401, { error: "Not authenticated (invalid session)" });
    }
    const user = userRes.user;

    // 2) Use service role for DB ops (but enforce our own checks)
    const db = createClient(supabaseUrl, serviceKey);

    // Tenant lookup by host
    const { data: tenant, error: tenantErr } = await db
      .from("tenants")
      .select("id, domain, subdomain, is_active, name, company_name")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (tenantErr) return json(500, { error: tenantErr.message });
    if (!tenant) return json(404, { error: "Tenant not found" });

    // Membership check
    const { data: membership, error: memErr } = await db
      .from("memberships")
      .select("id, role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr) return json(500, { error: memErr.message });
    if (!membership) return json(403, { error: "No membership for this tenant" });

    // Module assignment check (selfservice)
    const { data: mod, error: modErr } = await db
      .from("module_assignments")
      .select("id")
      .eq("membership_id", membership.id)
      .eq("module", "selfservice")
      .maybeSingle();

    if (modErr) return json(500, { error: modErr.message });
    if (!mod) return json(403, { error: "No selfservice module access" });

    // Profile (optional)
    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const submittedBy =
      (profile?.full_name && String(profile.full_name).trim()) || user.email || "User";

    const number = `INC-${Date.now().toString().slice(-6)}`;

    const { data: inserted, error: insErr } = await db
      .from("incidents")
      .insert({
        tenant_id: tenant.id,
        title: cleanTitle,
        description: cleanDesc,
        priority: cleanPriority,
        status: "new",
        triage_status: "untriaged",
        requester_id: user.id,
        submitted_by: submittedBy,
        number,
      })
      .select("id")
      .single();

    if (insErr) return json(500, { error: insErr.message });

    return json(200, { id: inserted.id });
  } catch (e: any) {
    return json(500, { error: e?.message || "Unexpected error" });
  }
}
