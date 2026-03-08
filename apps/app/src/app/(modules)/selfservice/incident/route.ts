import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Decode token from browser-format cookie
  const allCookies = req.cookies.getAll();
  const rawCookie = allCookies.find(
    c => c.name.match(/sb-.+-auth-token$/) && !c.name.includes(".")
  );

  let accessToken: string | null = null;
  if (rawCookie?.value?.startsWith("base64-")) {
    try {
      const raw = Buffer.from(rawCookie.value.slice(7), "base64").toString("utf8");
      accessToken = JSON.parse(raw).access_token ?? null;
    } catch { /* ignore */ }
  }

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  // Verify token directly via Supabase REST — same approach confirmed working
  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseKey,
    },
  });

  if (!authRes.ok) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const user = await authRes.json();
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  // Tenant resolution
  const host = getEffectiveHost(req.headers as unknown as Headers);
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) {
    return NextResponse.json({ ok: false, error: "No tenant context" }, { status: 400 });
  }

  // Use createClient with the access token for all DB operations
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant?.id) {
    return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const title       = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();
  const priority    = String(body?.priority || "Medium");

  if (!title)
    return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
  if (!description)
    return NextResponse.json({ ok: false, error: "Description is required" }, { status: 400 });
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
    return NextResponse.json({ ok: false, error: "Failed to generate incident number" }, { status: 500 });
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

  return NextResponse.json({ ok: true, id: inserted.id });
}
