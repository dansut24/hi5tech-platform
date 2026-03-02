import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  // We must create the response early so we can set cookies on it if Supabase refreshes.
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // ✅ Auth from cookies (httpOnly) – this is the key fix
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const user = userRes.user;

  if (userErr || !user) {
    // Helpful debug (remove later)
    const cookieNames = req.cookies.getAll().map((c) => c.name);
    return json(401, {
      error: "Not authenticated (no user from cookies)",
      cookieNames,
    });
  }

  // Tenant resolution from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) return json(400, { error: "No tenant context (no subdomain)" });

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (tenantErr || !tenant?.id) return json(404, { error: "Tenant not found" });

  // Optional: ensure this user is a member of this tenant (good security)
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.id) return json(403, { error: "Not a tenant member" });

  // Optional: ensure this user has selfservice module
  const { data: mod } = await supabase
    .from("module_assignments")
    .select("id")
    .eq("membership_id", membership.id)
    .eq("module", "selfservice")
    .maybeSingle();

  if (!mod?.id) return json(403, { error: "No selfservice access" });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const priority = String(body.priority || "medium").toLowerCase();

  if (!title) return json(400, { error: "Title is required" });
  if (!description) return json(400, { error: "Description is required" });

  // requester name
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

  if (insertErr || !inserted?.id) {
    return json(500, { error: insertErr?.message || "Failed to create incident" });
  }

  // Return JSON *and* include any cookie refresh on the response
  return NextResponse.json({ ok: true, id: inserted.id }, { status: 200, headers: res.headers });
}
