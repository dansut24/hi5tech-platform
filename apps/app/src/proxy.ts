import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function isBypassPath(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;
  if (pathname.startsWith("/assets")) return true;
  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/fonts")) return true;

  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/admin/setup")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/tenant-available")) return true;

  return false;
}

function getSubdomain(hostname: string) {
  const host = hostname.split(":")[0].toLowerCase();

  if (host === "localhost" || host.endsWith(".vercel.app"))
    return null;

  if (!host.endsWith(ROOT_DOMAIN))
    return null;

  if (host === ROOT_DOMAIN)
    return null;

  const sub = host.slice(0, -ROOT_DOMAIN.length - 1);
  if (!sub) return null;
  if (sub.includes(".")) return null;
  if (["www", "app"].includes(sub)) return null;

  return sub;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always create ONE response object
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  // Bypass early if needed
  if (isBypassPath(pathname)) {
    return res;
  }

  // -----------------------------
  // Supabase session refresh FIRST
  // -----------------------------
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
            setAll(cookiesToSet: CookieToSet[]) {
        const host = req.headers.get("host") || "";
        const h = host.split(":")[0].toLowerCase();
        const domain =
          h === "localhost" || h.endsWith(".vercel.app")
            ? undefined
            : `.${ROOT_DOMAIN}`;

        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, {
            ...options,
            domain: options?.domain ?? domain,
            path: options?.path ?? "/",
          });
        });
      },

  // CRITICAL: this refreshes & persists session cookies
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  // -----------------------------
  // Tenant subdomain detection
  // -----------------------------
  const host = req.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  // -----------------------------
  // Tenant existence check
  // -----------------------------
  if (subdomain) {
    const url = new URL("/api/tenant-exists", req.nextUrl.origin);
    url.searchParams.set("subdomain", subdomain);

    const check = await fetch(url.toString(), {
      headers: { "x-forwarded-host": host },
      cache: "no-store",
    });

    if (check.ok) {
      const data = await check.json().catch(() => ({}));
      if (!data?.exists) {
        const rewriteUrl = req.nextUrl.clone();
        rewriteUrl.pathname = "/tenant-available";
        rewriteUrl.searchParams.set("requested", subdomain);
        rewriteUrl.searchParams.set("path", pathname);
        return NextResponse.rewrite(rewriteUrl);
      }
    }
  }

  // -----------------------------
  // Authoritative onboarding gate
  // -----------------------------
  if (subdomain && user) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, is_active")
      .eq("domain", ROOT_DOMAIN)
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (tenant?.id) {
      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user.id)
        .maybeSingle();

      const role = String(membership?.role || "");
      const isAdmin = role === "owner" || role === "admin";

      if (isAdmin) {
        const { data: settings } = await supabase
          .from("tenant_settings")
          .select("onboarding_completed")
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        if (!settings?.onboarding_completed) {
          if (!pathname.startsWith("/admin/setup")) {
            const to = req.nextUrl.clone();
            to.pathname = "/admin/setup";
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
