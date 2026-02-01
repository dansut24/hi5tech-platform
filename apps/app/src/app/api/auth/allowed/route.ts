// apps/app/src/app/api/auth/allowed/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function getTenantFromHost(hostname: string) {
  const host = (hostname || "").split(":")[0].toLowerCase().trim();

  // Local / preview => no gating
  if (!host || host === "localhost" || host.endsWith(".vercel.app")) {
    return { domain: null as string | null, subdomain: null as string | null };
  }

  // Must be under root domain
  if (!host.endsWith(ROOT_DOMAIN)) {
    return { domain: null as string | null, subdomain: null as string | null };
  }

  // Root domain => not a tenant
  if (host === ROOT_DOMAIN) {
    return { domain: ROOT_DOMAIN, subdomain: null };
  }

  // "dan-sutton.hi5tech.co.uk" => "dan-sutton"
  const sub = host.slice(0, -ROOT_DOMAIN.length - 1);
  if (!sub) return { domain: ROOT_DOMAIN, subdomain: null };

  // Ignore non-tenant subdomains if you use them
  if (sub === "www" || sub === "app") {
    return { domain: ROOT_DOMAIN, subdomain: null };
  }

  return { domain: ROOT_DOMAIN, subdomain: sub };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { allowed: false, reason: "missing_email" },
        { status: 400 }
      );
    }

    // Prefer forwarded host on Vercel/Proxies
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "";

    const { domain, subdomain } = getTenantFromHost(host);

    // If no tenant subdomain (root domain/app/www/etc), you can choose:
    // - allow false (safer), or
    // - allow true (if you want global login)
    if (!domain || !subdomain) {
      return NextResponse.json({
        allowed: false,
        reason: "no_tenant_subdomain",
      });
    }

    const supabase = await supabaseServer();

    // Call your SQL function
    const { data, error } = await supabase.rpc("is_email_allowed_for_tenant", {
      p_domain: domain,
      p_subdomain: subdomain,
      p_email: email,
    });

    if (error) {
      return NextResponse.json(
        { allowed: false, reason: "rpc_error", detail: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ allowed: Boolean(data) });
  } catch (e: any) {
    return NextResponse.json(
      { allowed: false, reason: "server_error", detail: e?.message || String(e) },
      { status: 200 }
    );
  }
}
