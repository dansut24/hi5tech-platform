// apps/app/src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = {
  name: string;
  value: string;
  options?: any;
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

    // Fail open (don’t lock people out if the check fails)
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

  // 3) Supabase cookie refresh (fixes long-lived session + cookie mutation errors)
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // refresh session if needed (writes cookies into `res`)
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  // 4) ✅ Authoritative onboarding gate (central)
  // If an owner/admin is logged in on a tenant subdomain and onboarding isn't complete,
  // force them to /admin/setup regardless of where they landed after login.
  if (subdomain && user) {
    // Lookup tenant id (RLS should allow this read with anon key if your table is public readable;
    // if not, ensure your policy allows select by domain/subdomain.)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, domain, subdomain, is_active")
      .eq("domain", ROOT_DOMAIN)
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (tenant?.id) {
      const tenantId = tenant.id as string;

      // Check membership role
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

        if (!done) {
          // Avoid loops (setup allowed via isBypassPath, but keep this safe anyway)
          if (!pathname.startsWith("/admin/setup")) {
            const to = req.nextUrl.clone();
            to.pathname = "/admin/setup";
            to.search = "";
            return NextResponse.redirect(to);
          }
        }
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
