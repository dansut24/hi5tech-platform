// apps/app/src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  try {
    const host = new URL(url).host;
    const ref = host.split(".")[0];

    return ref || "ciilmjntkujdhxtsmsho";
  } catch {
    return "ciilmjntkujdhxtsmsho";
  }
}

const PROJECT_REF = getProjectRef();
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
const CHUNK_0 = `${COOKIE_NAME}.0`;
const CHUNK_1 = `${COOKIE_NAME}.1`;

function cookieDomainForRequest(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();

  if (!host || host === "localhost" || host.endsWith(".localhost")) {
    return undefined;
  }

  if (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)) {
    return `.${ROOT_DOMAIN}`;
  }

  return undefined;
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const browserCookie = req.cookies.get(COOKIE_NAME)?.value;

  if (!browserCookie || req.cookies.has(CHUNK_0)) {
    return res;
  }

  let raw = browserCookie;

  if (raw.startsWith("base64-")) {
    try {
      raw = atob(raw.slice(7));
    } catch {
      return res;
    }
  }

  const chunk0 = raw.slice(0, 3600);
  const chunk1 = raw.slice(3600);

  const cookieOpts = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    domain: cookieDomainForRequest(req),
    maxAge: 60 * 60 * 24 * 7,
  };

  res.cookies.set(CHUNK_0, chunk0, cookieOpts);

  if (chunk1) {
    res.cookies.set(CHUNK_1, chunk1, cookieOpts);
  }

  req.cookies.set(CHUNK_0, chunk0);

  if (chunk1) {
    req.cookies.set(CHUNK_1, chunk1);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
