// apps/app/src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

// Paths we should never block/rewrite (and should not waste time refreshing)
function isBypassPath(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;
  if (pathname.startsWith("/api")) return true; // route handlers manage their own auth
  if (pathname.startsWith("/tenant-available")) return true;

  // Optional common static paths
  if (pathname.startsWith("/assets")) return true;
  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/fonts")) return true;

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
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // refresh session if needed (writes cookies into `res`)
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
