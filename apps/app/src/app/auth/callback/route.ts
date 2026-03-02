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

  // ✅ Critical: exchange code->session & refresh cookies
  // If there is no code, this is still safe; it will just keep existing cookies.
  await supabase.auth.getUser();

  return res;
}
