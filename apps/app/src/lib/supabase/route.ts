import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * Mirror the same shared-domain logic as supabaseServer() so that refreshed
 * auth cookies are valid across all tenant subdomains (e.g. dan-sutton.hi5tech.co.uk).
 * Without this, a token refresh in an API route writes cookies without the
 * domain attribute and the browser won't send them on the next subdomain request,
 * causing spurious 401s.
 */
function withSharedDomain(options?: CookieOptions): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: true,
    ...options,
    domain: `.${ROOT_DOMAIN}`,
  };
}

export function supabaseRoute(req: NextRequest, res: NextResponse) {
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

  return supabase;
}
