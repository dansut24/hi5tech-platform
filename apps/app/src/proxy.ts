// apps/app/src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

// Paths we should never block/rewrite (and should not waste time refreshing)
function isBypassPath(pathname: string) {
  // next internals + static
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;
  if (pathname.startsWith("/assets")) return true;
  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/fonts")) return true;

  // auth + login flows must never be blocked
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/auth")) return true;

  // setup must always be reachable (avoid redirect loops)
  if (pathname.startsWith("/admin/setup")) return true;

  // api routes manage their own auth
  if (pathname.startsWith("/api")) return true;

  if (pathname.startsWith("/tenant-available")) return true;

  return false;
}

function getSubdomain(hostname: string) {
  const host = hostname.split(":")[0].toLowerCase();

  // localhost / preview domains — don’t gate
  if (host === "localhost" || host.endsWith(".vercel.app")) return null;

  // Only gate things under root domain
  if (!host.endsWith(ROOT_DOMAIN)) return null;

  // root domain => no subdomain
  if (host === ROOT_DOMAIN) return null;

  const sub = host.slice(0, -ROOT_DOMAIN.length - 1);
  if (!sub) return null;

  // Avoid multi-level (a.b.hi5tech.co.uk)
  if (sub.includes(".")) return null;

  // ignore common non-tenant subdomains
  if (["www", "app"].includes(sub)) return null;

  return sub;
}

function sharedCookieDomain(hostHeader: string) {
  const h = (hostHeader || "").split(":")[0].toLowerCase();
  if (!h) return undefined;
  if (h === "localhost" || h.endsWith(".vercel.app")) return undefined;
  return `.${ROOT_DOMAIN}`;
}

// Next.js "proxy.ts" entrypoint
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Skip static + api etc
  if (isBypassPath(pathname)) return NextResponse.next();

  const host = req.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  // 2) Tenant gating (only if it looks like a tenant subdomain)
  if (subdomain) {
    const url = new URL(req.nextUrl.origin);
    url.pathname = "/api/tenant-exists";
    url.searchParams.set("subdomain", subdomain);

    const check = await fetch(url.toString(), {
      headers: { "x-forwarded-host": host },
      cache: "no-store",
    });

    // Fail open
    if (check.ok) {
      const data = (await check.json().catch(() => ({}))) as { exists?: boolean };
      const exists = Boolean(data?.exists);

      if (!exists) {
        const rewriteUrl = req.nextUrl.clone();
        rewriteUrl.pathname = "/tenant-available";
        rewriteUrl.searchParams.set("requested", subdomain);
        rewriteUrl.searchParams.set("path", pathname);
        return NextResponse.rewrite(rewriteUrl);
      }
    }
  }

  // 3) Supabase cookie refresh
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        const domain = sharedCookieDomain(host);
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, {
            ...options,
            // ✅ critical: share auth cookies across tenant subdomains
            domain: options?.domain ?? domain,
            path: options?.path ?? "/",
          });
        }
      },
    },
  });

  // CRITICAL: this refreshes & persists session cookies into `res`
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  // 4) Authoritative onboarding gate (central)
  if (subdomain && user) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, is_active")
      .eq("domain", ROOT_DOMAIN)
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (tenant?.id) {
      const tenantId = tenant.id as string;

      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle();

      const role = String(membership?.role || "");
      const isAdmin = role === "owner" || role === "admin";

      if (isAdmin) {
        const { data: settings } = await supabase
          .from("tenant_settings")
          .select("onboarding_completed")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        const done = Boolean(settings?.onboarding_completed);

        if (!done && !pathname.startsWith("/admin/setup")) {
          const to = req.nextUrl.clone();
          to.pathname = "/admin/setup";
          to.search = "";
          return NextResponse.redirect(to);
        }
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
