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
  return false;
}

function getSubdomain(hostname: string) {
  // strip port if any
  const host = hostname.split(":")[0].toLowerCase();

  // localhost / preview domains — don’t gate
  if (host === "localhost" || host.endsWith(".vercel.app")) return null;

  // Only gate things under root domain
  if (!host.endsWith(ROOT_DOMAIN)) return null;

  // root domain (hi5tech.co.uk) => no subdomain
  if (host === ROOT_DOMAIN) return null;

  // www / app etc can be treated as “non-tenant”
  const sub = host.slice(0, -ROOT_DOMAIN.length - 1); // remove ".hi5tech.co.uk"
  if (!sub) return null;

  // ignore common non-tenant subdomains
  if (sub === "www" || sub === "app") return null;

  return sub;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isBypassPath(pathname)) return NextResponse.next();

  const host = req.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  // No tenant subdomain → allow (root domain / app subdomain / localhost)
  if (!subdomain) return NextResponse.next();

  // Ask our own API if tenant exists
  const url = new URL(req.nextUrl.origin);
  url.pathname = "/api/tenant-exists";
  url.searchParams.set("subdomain", subdomain);

  const res = await fetch(url.toString(), {
    // Edge fetch; keep it simple
    headers: { "x-forwarded-host": host },
    cache: "no-store",
  });

  if (!res.ok) {
    // If the check fails, fail open (don’t lock users out)
    return NextResponse.next();
  }

  const data = (await res.json()) as { exists?: boolean };
  const exists = Boolean(data?.exists);

  if (exists) return NextResponse.next();

  // Tenant does NOT exist → rewrite to tenant-available page
  const rewriteUrl = req.nextUrl.clone();
  rewriteUrl.pathname = "/tenant-available";
  rewriteUrl.searchParams.set("requested", subdomain);
  rewriteUrl.searchParams.set("path", pathname);

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: [
    // Run on all routes except static assets handled above
    "/((?!_next/static|_next/image).*)",
  ],
};
