// apps/app/src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function sharedCookieDomain(hostname: string) {
  const host = hostname.split(":")[0].toLowerCase();
  if (host === "localhost" || host.endsWith(".vercel.app")) return undefined;
  // Share cookies across app.hi5tech.co.uk + tenant subdomains
  return `.${ROOT_DOMAIN}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // where to go after callback
  const next = url.searchParams.get("next") || "/";
  const redirectTo = new URL(next, url.origin);

  // Supabase returns either `code` (PKCE) or sometimes `token_hash` flows
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  const res = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          const domain = sharedCookieDomain(req.headers.get("host") || "");
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, {
              ...options,
              // IMPORTANT: share across subdomains
              domain: options?.domain ?? domain,
              path: options?.path ?? "/",
            });
          }
        },
      },
    }
  );

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return NextResponse.redirect(new URL("/login?e=callback", url.origin));
      return res;
    }

    // Optional: handle invite/recovery token_hash if it hits callback
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      });
      if (error) return NextResponse.redirect(new URL("/login?e=verify", url.origin));
      return res;
    }

    // Nothing usable
    return NextResponse.redirect(new URL("/login?e=missing_code", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/login?e=exception", url.origin));
  }
}
