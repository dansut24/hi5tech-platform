import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { MODULE_PATH, type ModuleKey } from "@hi5tech/rbac";

const PUBLIC_PREFIXES = [
  "/login",
  "/auth/callback",
  "/_next",
  "/favicon.ico"
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Debug: mark every response so we can see middleware ran
  const res = NextResponse.next();
  res.headers.set("x-hi5-mw", "1");

  if (isPublic(pathname)) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("x-hi5-mw", "1");
    return redirect;
  }

  if (pathname === "/") {
    const { data } = await supabase
      .from("user_modules")
      .select("modules")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const modules = (data?.modules ?? []) as ModuleKey[];

    const url = request.nextUrl.clone();

    if (!modules.length) {
      url.pathname = "/no-access";
      const redirect = NextResponse.redirect(url);
      redirect.headers.set("x-hi5-mw", "1");
      return redirect;
    }

    if (modules.length === 1) {
      url.pathname = MODULE_PATH[modules[0]];
      const redirect = NextResponse.redirect(url);
      redirect.headers.set("x-hi5-mw", "1");
      return redirect;
    }

    url.pathname = "/apps";
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("x-hi5-mw", "1");
    return redirect;
  }

  return res;
}

export const config = {
  matcher: ["/:path*"]
};