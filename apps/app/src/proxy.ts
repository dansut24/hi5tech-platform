// apps/app/src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
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
  if (host === "localhost" || host.endsWith(".vercel.app")) return null;
  if (!host.endsWith(ROOT_DOMAIN)) return null;
  if (host === ROOT_DOMAIN) return null;

  const sub = host.slice(0, -ROOT_DOMAIN.length - 1);
  if (!sub) return null;
  if (sub.includes(".")) return null;
  if (["www", "app"].includes(sub)) return null;

  return sub;
}

function normalizeCookieOptions(opts?: CookieOptions): CookieOptions | undefined {
  const options: CookieOptions = { ...(opts || {}) };
  options.domain = options.domain ?? `.${ROOT_DOMAIN}`;
  options.path = options.path ?? "/";
  options.sameSite = options.sameSite ?? "lax";
  options.secure = options.secure ?? true;
  return options;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isBypassPath(pathname)) return NextResponse.next();

  const host = req.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  // Tenant existence gate (optional)
  if (subdomain) {
    const url = new URL(req.nextUrl.origin);
    url.pathname = "/api/tenant-exists";
    url.searchParams.set("subdomain", subdomain);

    const check = await fetch(url.toString(), {
      headers: { "x-forwarded-host": host },
      cache: "no-store",
    });

    if (check.ok) {
      const data = (await check.json().catch(() => ({}))) as { exists?: boolean };
      if (!Boolean(data?.exists)) {
        const rewriteUrl = req.nextUrl.clone();
        rewriteUrl.pathname = "/tenant-available";
        rewriteUrl.searchParams.set("requested", subdomain);
        rewriteUrl.searchParams.set("path", pathname);
        return NextResponse.rewrite(rewriteUrl);
      }
    }
  }

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
            res.cookies.set(name, value, normalizeCookieOptions(options));
          }
        },
      },
    }
  );

  // Refresh session if needed (this is what makes cookies persist)
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
