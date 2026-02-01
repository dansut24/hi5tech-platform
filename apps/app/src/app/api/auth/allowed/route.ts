import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function parseTenant(hostname: string) {
  const host = (hostname || "").split(":")[0].toLowerCase().trim();

  if (!host) return { host, domain: null as string | null, subdomain: null as string | null };

  // Local / preview => no gating
  if (host === "localhost" || host.endsWith(".vercel.app")) {
    return { host, domain: null, subdomain: null };
  }

  // Must be under root domain
  if (!host.endsWith(ROOT_DOMAIN)) {
    return { host, domain: null, subdomain: null };
  }

  // Root domain => not tenant
  if (host === ROOT_DOMAIN) {
    return { host, domain: ROOT_DOMAIN, subdomain: null };
  }

  const sub = host.slice(0, -ROOT_DOMAIN.length - 1); // remove ".hi5tech.co.uk"
  if (!sub) return { host, domain: ROOT_DOMAIN, subdomain: null };

  // Ignore non-tenant subdomains
  if (sub === "www" || sub === "app") {
    return { host, domain: ROOT_DOMAIN, subdomain: null };
  }

  return { host, domain: ROOT_DOMAIN, subdomain: sub };
}

export async function POST(req: NextRequest) {
  const debug: any = {
    root_domain: ROOT_DOMAIN,
    hdr_host: req.headers.get("host"),
    hdr_x_forwarded_host: req.headers.get("x-forwarded-host"),
    hdr_x_forwarded_proto: req.headers.get("x-forwarded-proto"),
  };

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    debug.email = email;

    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "";

    const parsed = parseTenant(host);
    debug.parsed = parsed;

    if (!email) {
      return NextResponse.json({ allowed: false, reason: "missing_email", debug }, { status: 200 });
    }

    if (!parsed.domain || !parsed.subdomain) {
      return NextResponse.json(
        { allowed: false, reason: "no_tenant_subdomain", debug },
        { status: 200 }
      );
    }

    const supabase = await supabaseServer();

    const { data, error } = await supabase.rpc("is_email_allowed_for_tenant", {
      p_domain: parsed.domain,
      p_subdomain: parsed.subdomain,
      p_email: email,
    });

    debug.rpc = {
      data,
      error: error ? { message: error.message, code: (error as any).code } : null,
      args: { p_domain: parsed.domain, p_subdomain: parsed.subdomain, p_email: email },
    };

    if (error) {
      return NextResponse.json({ allowed: false, reason: "rpc_error", debug }, { status: 200 });
    }

    return NextResponse.json({ allowed: Boolean(data), debug }, { status: 200 });
  } catch (e: any) {
    debug.exception = e?.message || String(e);
    return NextResponse.json({ allowed: false, reason: "server_error", debug }, { status: 200 });
  }
}
