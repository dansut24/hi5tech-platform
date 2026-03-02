// apps/app/src/app/api/selfservice/incident/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import type { CookieOptions } from "@supabase/ssr";

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
        // Ensure cookies are actually persisted on the response
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: false }, { status: 200 });

  try {
    const supabase = supabaseFromRequest(req, res);

    // ✅ Auth from cookies
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated (invalid session)", details: userErr.message },
        { status: 401 }
      );
    }
    const user = userRes.user;
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated (no user from cookies)" }, { status: 401 });
    }

    // ✅ Tenant resolution from host
    const host = getEffectiveHost(req.headers as any);
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
      return NextResponse.json({ ok: false, error: "Tenant lookup failed", details: tenantErr.message }, { status: 500 });
    }
    if (!tenant?.id) {
      return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
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

    if (!title) return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    if (!description) return NextResponse.json({ ok: false, error: "Description is required" }, { status: 400 });

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
      return NextResponse.json(
        { ok: false, error: "Failed to create incident", details: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: inserted.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Unexpected error", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
