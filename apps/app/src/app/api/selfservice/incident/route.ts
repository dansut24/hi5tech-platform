// apps/app/src/app/api/selfservice/incident/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function supabaseFromRequest(req: NextRequest, res: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });
}

// Copy any cookies written to `from` onto `to`
function carryCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value, c);
  }
  return to;
}

export async function POST(req: NextRequest) {
  // IMPORTANT: this "base" response is what Supabase writes cookies onto
  const base = new NextResponse(null, { status: 200 });
  const supabase = supabaseFromRequest(req, base);

  // 1) Auth
  const { data: userRes, error: userErr } = await supabase.auth.getUser();

  if (userErr) {
    const out = NextResponse.json(
      { ok: false, error: "Not authenticated (invalid session)", details: userErr.message },
      { status: 401 }
    );
    return carryCookies(base, out);
  }

  const user = userRes.user;
  if (!user) {
    const out = NextResponse.json(
      { ok: false, error: "Not authenticated (no user from cookies)" },
      { status: 401 }
    );
    return carryCookies(base, out);
  }

  // 2) Tenant resolution
  const host = getEffectiveHost(req.headers as any);
  const parsed = parseTenantHost(host);

  if (!parsed.subdomain) {
    const out = NextResponse.json({ ok: false, error: "No tenant context" }, { status: 400 });
    return carryCookies(base, out);
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (tenantErr) {
    const out = NextResponse.json(
      { ok: false, error: "Tenant lookup failed", details: tenantErr.message },
      { status: 500 }
    );
    return carryCookies(base, out);
  }

  if (!tenant?.id) {
    const out = NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
    return carryCookies(base, out);
  }

  // 3) Body
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    priority?: string;
  };

  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const priority = String(body.priority || "medium").toLowerCase();

  if (!title) {
    const out = NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    return carryCookies(base, out);
  }

  if (!description) {
    const out = NextResponse.json({ ok: false, error: "Description is required" }, { status: 400 });
    return carryCookies(base, out);
  }

  // 4) Optional profile name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const number = `INC-${Date.now().toString().slice(-6)}`;

  const { data: inserted, error: insertErr } = await supabase
    .from("incidents")
    .insert({
      tenant_id: tenant.id,
      title,
      description,
      priority,
      status: "new",
      triage_status: "untriaged",
      requester_id: user.id,
      submitted_by: profile?.full_name ?? user.email,
      number,
    })
    .select("id")
    .single();

  if (insertErr) {
    const out = NextResponse.json(
      { ok: false, error: "Failed to create incident", details: insertErr.message },
      { status: 500 }
    );
    return carryCookies(base, out);
  }

  const out = NextResponse.json({ ok: true, id: inserted.id }, { status: 200 });
  return carryCookies(base, out);
}
