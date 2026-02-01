import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function getTenantFromHost(host: string) {
  const hostname = (host || "").split(":")[0].toLowerCase();

  // preview/local => don't gate
  if (hostname === "localhost" || hostname.endsWith(".vercel.app")) return null;

  // must be under root domain
  if (!hostname.endsWith(ROOT_DOMAIN)) return null;

  // root => no tenant
  if (hostname === ROOT_DOMAIN) return null;

  const sub = hostname.slice(0, -ROOT_DOMAIN.length - 1);
  if (!sub) return null;

  // non-tenant subdomains
  if (sub === "www" || sub === "app") return null;

  return { domain: ROOT_DOMAIN, subdomain: sub };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

export async function POST(req: Request) {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";

  const tenant = getTenantFromHost(host);

  // if not a tenant host, allow (root / app / preview)
  if (!tenant) {
    return NextResponse.json({ allowed: true, reason: "no-tenant-host" });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ allowed: false, reason: "missing-email" }, { status: 400 });
  }

  // 1) find tenant by (domain, subdomain)
  const { data: t, error: terr } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", tenant.domain)
    .eq("subdomain", tenant.subdomain)
    .maybeSingle();

  if (terr || !t?.id) {
    return NextResponse.json({ allowed: false, reason: "tenant-not-found" });
  }

  // 2) check membership by email (profiles.email)
  const { data: rows, error: merr } = await supabase
    .from("memberships")
    .select("id, profiles!inner(email)")
    .eq("tenant_id", t.id)
    .ilike("profiles.email", email)
    .limit(1);

  if (merr) {
    return NextResponse.json({ allowed: false, reason: "query-error" }, { status: 500 });
  }

  const allowed = Array.isArray(rows) && rows.length > 0;

  return NextResponse.json({ allowed });
}
