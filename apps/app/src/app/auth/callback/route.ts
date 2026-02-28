import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

function cookieDomainFromHost(host?: string | null) {
  const h = String(host || "").split(":")[0].toLowerCase();
  if (!h) return undefined;
  if (h === "localhost" || h.endsWith(".vercel.app")) return undefined;
  return `.${ROOT_DOMAIN}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/";
  const code = url.searchParams.get("code"); // present for OAuth/PKCE flows

  const cookieStore = await cookies();
  const host = req.headers.get("host");
  const domain = cookieDomainFromHost(host);

  const res = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, {
              ...options,
              domain: options?.domain ?? domain,
              path: options?.path ?? "/",
            });
          }
        },
      },
    }
  );

  // 1) If this is an OAuth/PKCE callback, exchange the code for a session cookie
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // If exchange fails, send to login (preserve next)
      const to = new URL("/login", url.origin);
      to.searchParams.set("next", next);
      return NextResponse.redirect(to);
    }
  }

  // 2) For BOTH flows (code or no code), confirm we now have a user session
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    const to = new URL("/login", url.origin);
    to.searchParams.set("next", next);
    return NextResponse.redirect(to);
  }

  // ✅ user exists, cookies are set (if needed), proceed to next
  return res;
}
