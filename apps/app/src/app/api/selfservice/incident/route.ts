// apps/app/src/app/api/selfservice/incident/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  // Auth
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Tenant resolution
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) {
    return NextResponse.json({ error: "No tenant context" }, { status: 400 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant?.id) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();
  const priority = String(body?.priority || "medium").toLowerCase();

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  // Profile (for submitted_by)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

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
      submitted_by: profile?.full_name ?? user.email ?? "user",
      number,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api/selfservice/incident] insert error:", error);
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id });
}
