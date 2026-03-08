// apps/app/src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const PROJECT_REF = "ciilmjntkujdhxtsmsho";
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
const CHUNK_0     = `${COOKIE_NAME}.0`;
const CHUNK_1     = `${COOKIE_NAME}.1`;

/**
 * Supabase browser client writes a single cookie:
 *   sb-xxx-auth-token=base64-eyJ...
 *
 * Supabase SSR client expects chunked cookies:
 *   sb-xxx-auth-token.0=base64-eyJ...  (first 3600 chars)
 *   sb-xxx-auth-token.1=...             (remainder)
 *
 * This middleware detects the browser-format cookie and re-stamps it
 * in chunked format so every server-side supabaseRoute() / supabaseServer()
 * call can read the session correctly.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const browserCookie = req.cookies.get(COOKIE_NAME)?.value;

  // Already chunked — nothing to do
  if (!browserCookie || req.cookies.has(CHUNK_0)) {
    return res;
  }

  // Decode base64- prefix if present
  let raw = browserCookie;
  if (raw.startsWith("base64-")) {
    try {
      raw = atob(raw.slice(7));
    } catch {
      return res;
    }
  }

  // Split into chunks of 3600 chars (Supabase SSR default chunk size)
  const chunk0 = raw.slice(0, 3600);
  const chunk1 = raw.slice(3600);

  const cookieOpts = {
    path:     "/",
    sameSite: "lax" as const,
    secure:   true,
    domain:   ".hi5tech.co.uk",
    // Match the original cookie's max-age if possible, default 1 week
    maxAge:   60 * 60 * 24 * 7,
  };

  // Write chunked cookies onto the response so the browser gets them
  res.cookies.set(CHUNK_0, chunk0, cookieOpts);
  if (chunk1) {
    res.cookies.set(CHUNK_1, chunk1, cookieOpts);
  }

  // Also inject into the current request so THIS request's route
  // handlers can read them immediately without a round-trip
  req.cookies.set(CHUNK_0, chunk0);
  if (chunk1) {
    req.cookies.set(CHUNK_1, chunk1);
  }

  return res;
}

export const config = {
  matcher: [
    // Run on all routes except static files and _next internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
