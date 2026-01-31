import { NextResponse, type NextRequest } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

// Paths we should never block/rewrite
function isBypassPath(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/robots.txt")) return true;
  if (pathname.startsWith("/sitemap")) return true;
  if (pathname.startsWith("/api")) return true;
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isBypassPath(pathname)) return NextResponse.next();

  const host = req.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  // No tenant subdomain → allow
  if (!subdomain) return NextResponse.next();

  // Ask our own API if tenant exists
  const url = new URL(req.nextUrl.origin);
  url.pathname = "/api/tenant-exists";
  url.searchParams.set("subdomain", subdomain);

  const res = await fetch(url.toString(), {
    headers: { "x-forwarded-host": host },
    cache: "no-store",
  });

  if (!res.ok) return NextResponse.next(); // fail open

  const data = (await res.json()) as { exists?: boolean };
  if (data?.exists) return NextResponse.next();

  // Tenant does NOT exist → rewrite to tenant-available page
  const rewriteUrl = req.nextUrl.clone();
  rewriteUrl.pathname = "/tenant-available";
  rewriteUrl.searchParams.set("requested", subdomain);
  rewriteUrl.searchParams.set("path", pathname);

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
