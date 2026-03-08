import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export async function POST(req: NextRequest) {
  // The browser Supabase client stores the session as a base64-encoded JSON cookie.
  // We decode it directly and extract the access_token to authenticate the request.
  const allCookies = req.cookies.getAll();

  const rawCookie = allCookies.find(
    c => c.name.match(/sb-.+-auth-token$/) && !c.name.includes(".")
  );

  // Also check chunked format (.0) as fallback
  const chunkCookie = allCookies.find(c => c.name.endsWith(".0"));

  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  // Try base64 browser cookie first
  if (rawCookie?.value?.startsWith("base64-")) {
    try {
      const raw = Buffer.from(rawCookie.value.slice(7), "base64").toString("utf8");
      const session = JSON.parse(raw);
      accessToken = session.access_token ?? null;
      refreshToken = session.refresh_token ?? null;
    } catch {
      // fall through
    }
  }

  // Try chunked cookie (.0 only may have full content if session is small enough)
  if (!accessToken && chunkCookie?.value) {
    try {
      const session = JSON.parse(chunkCookie.value);
      accessToken = session.access_token ?? null;
      refreshToken = session.refresh_token ?? null;
    } catch {
      // fall through
    }
  }

  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  // Validate the token with Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );

  const { data: userRes, error: userErr } = await supabase.auth.getUser(accessToken);
  if (userErr || !userRes.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const user = userRes.user;

  // Tenant resolution
  const host = getEffectiveHost(req.headers as unknown as Headers);
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) {
    return NextResponse.json({ ok: false, error: "No tenant context" }, { status: 400 });
  }

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
