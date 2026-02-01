import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function getTenantFromHost(host: string) {
  const hostname = (host || "").split(":")[0].toLowerCase();

  if (!hostname.endsWith(ROOT_DOMAIN)) return null;
  if (hostname === ROOT_DOMAIN) return null;

  const sub = hostname.slice(0, -ROOT_DOMAIN.length - 1); // remove ".root"
  if (!sub || sub === "www" || sub === "app") return null;

  return { domain: ROOT_DOMAIN, subdomain: sub };
}

export async function POST(req: Request) {
  const h = await headers();
  const host = h.get("host") || h.get("x-forwarded-host") || "";

  const tenant = getTenantFromHost(host);
  if (!tenant) {
    return NextResponse.json({ allowed: true, reason: "no-tenant-host" });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim();
  if (!email) {
    return NextResponse.json({ allowed: false, reason: "missing-email" }, { status: 400 });
  }

  const supabase = await supabaseServer();

  // Prefer calling your SQL function if it's present (yours is correct)
  const { data, error } = await supabase.rpc("is_email_allowed_for_tenant", {
    p_domain: tenant.domain,
    p_subdomain: tenant.subdomain,
    p_email: email,
  });

  if (error) {
    // Fail closed is safer for auth
    return NextResponse.json({ allowed: false, reason: "rpc-error" }, { status: 500 });
  }

  return NextResponse.json({ allowed: Boolean(data) });
}
