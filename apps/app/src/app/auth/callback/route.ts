// apps/app/src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

function withSharedDomain(options?: CookieOptions): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: true,
    ...options,
    domain: `.${ROOT_DOMAIN}`,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/apps";
  const code = url.searchParams.get("code");

  // If no code param, the session was set client-side via createBrowserClient (localStorage).
  // We can't read that server-side, so redirect to /auth/stamp — a client page
  // that reads the browser session and POSTs it to /api/auth/session to stamp
  // it into shared-domain server cookies.
  if (!code) {
    const stamp = new URL("/auth/stamp", url.origin);
    stamp.searchParams.set("next", next);
    return NextResponse.redirect(stamp);
  }

  const res = NextResponse.redirect(new URL(next, url.origin));

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
            res.cookies.set(name, value, withSharedDomain(options));
          }
        },
      },
    }
  );

  // Exchange PKCE code for session and stamp shared-domain cookies
  await supabase.auth.exchangeCodeForSession(code);

  return res;
}
