// apps/app/src/app/api/selfservice/incident/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function POST(req: NextRequest) {
  const token = getBearer(req);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated — missing token" },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated — invalid token" },
      { status: 401 }
    );
  }
  const user = userRes.user;

  const host = getEffectiveHost(req.headers as unknown as Headers);
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) {
    return NextResponse.json({ ok: false, error: "No tenant context" }, { status: 400 });
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (tenantErr) {
    return NextResponse.json({ ok: false, error: "Tenant lookup failed" }, { status: 500 });
  }
  if (!tenant?.id) {
    return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    priority?: string;
  };

  const title       = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const priority    = String(body.priority || "Medium");

  if (!title)       return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
  if (!description) return NextResponse.json({ ok: false, error: "Description is required" }, { status: 400 });

  if (title.length > 255)
    return NextResponse.json({ ok: false, error: "Title must be 255 characters or fewer" }, { status: 400 });
  if (description.length > 10000)
    return NextResponse.json({ ok: false, error: "Description must be 10,000 characters or fewer" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: counterData, error: counterErr } = await supabase.rpc(
    "next_tenant_counter",
    { p_tenant_id: tenant.id, p_counter_name: "incidents" }
  );

  if (counterErr || counterData == null) {
    console.error("[selfservice/incident] counter error:", counterErr?.message);
    return NextResponse.json(
      { ok: false, error: "Failed to generate incident number" },
      { status: 500 }
    );
  }

  const number = `INC-${String(counterData).padStart(5, "0")}`;

  const { data: inserted, error: insertErr } = await supabase
    .from("incidents")
    .insert({
      tenant_id:     tenant.id,
      title,
      description,
      priority,
      status:        "Open",
      triage_status: "triage",
      requester_id:  user.id,
      submitted_by:  (profile as { full_name?: string } | null)?.full_name ?? user.email,
      number,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[selfservice/incident] insert error:", insertErr.message);
    return NextResponse.json({ ok: false, error: "Failed to create incident" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 200 });
}
