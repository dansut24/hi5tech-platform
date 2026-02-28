import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { supabaseRoute } from "@/lib/supabase/route";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: false }, { status: 500 });
  const supabase = supabaseRoute(req, res);

  // Auth (server-side)
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Tenant resolution
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant?.id) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Body
  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();
  const priority = String(body?.priority || "medium").toLowerCase();

  if (!title || !description) {
    return NextResponse.json({ error: "Missing title/description" }, { status: 400 });
  }

  // Reference
  const number = `INC-${Date.now().toString().slice(-6)}`;

  const { data: inserted, error } = await supabase
    .from("incidents")
    .insert({
      tenant_id: tenant.id,
      title,
      description,
      priority,
      status: "new",
      triage_status: "untriaged",
      requester_id: user.id,
      submitted_by: user.email,
      number,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
