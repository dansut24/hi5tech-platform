// apps/app/src/app/api/selfservice/incident/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function withSharedDomain(options?: CookieOptions): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: true,
    ...options,
    domain: `.${ROOT_DOMAIN}`,
  };
}

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
          res.cookies.set(name, value, withSharedDomain(options));
        }
      },
    },
  });
}

/** Create a JSON response AND preserve any cookies Supabase wrote onto `base`. */
function jsonWithCookies(base: NextResponse, body: any, init?: ResponseInit) {
  const out = NextResponse.json(body, init);
  for (const c of base.cookies.getAll()) {
    out.cookies.set(c.name, c.value, c);
  }
  return out;
}

export async function POST(req: NextRequest) {
  // This is the response Supabase will write refreshed cookies onto
  const base = new NextResponse(null, { status: 200 });
  const supabase = supabaseFromRequest(req, base);

  try {
    // ✅ Auth from cookies
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr) {
      return jsonWithCookies(
        base,
        { ok: false, error: "Not authenticated (invalid session)", details: userErr.message },
        { status: 401 }
      );
    }

    const user = userRes.user;
    if (!user) {
      return jsonWithCookies(
        base,
        { ok: false, error: "Not authenticated (no user from cookies)" },
        { status: 401 }
      );
    }

    // ✅ Tenant resolution from host
    const host = getEffectiveHost(req.headers as any);
    const parsed = parseTenantHost(host);

    if (!parsed.subdomain) {
      return jsonWithCookies(base, { ok: false, error: "No tenant context" }, { status: 400 });
    }

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id")
      .eq("domain", parsed.rootDomain)
      .eq("subdomain", parsed.subdomain)
      .maybeSingle();

    if (tenantErr) {
      return jsonWithCookies(
        base,
        { ok: false, error: "Tenant lookup failed", details: tenantErr.message },
        { status: 500 }
      );
    }

    if (!tenant?.id) {
      return jsonWithCookies(base, { ok: false, error: "Tenant not found" }, { status: 404 });
    }

    // ✅ Parse body
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
      priority?: string;
    };

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const priority = String(body.priority || "medium").toLowerCase();

    if (!title) return jsonWithCookies(base, { ok: false, error: "Title is required" }, { status: 400 });
    if (!description) return jsonWithCookies(base, { ok: false, error: "Description is required" }, { status: 400 });

    // Profile (for submitted_by)
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
      return jsonWithCookies(
        base,
        { ok: false, error: "Failed to create incident", details: insertErr.message },
        { status: 500 }
      );
    }

    return jsonWithCookies(base, { ok: true, id: inserted.id }, { status: 200 });
  } catch (e: any) {
    return jsonWithCookies(
      base,
      { ok: false, error: "Unexpected error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
