// TEMPORARY DEBUG ROUTE - remove after fixing
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function GET(req: NextRequest) {
  const allCookies = req.cookies.getAll();
  const cookieNames = allCookies.map(c => c.name);
  const supabaseCookies = allCookies.filter(c => c.name.startsWith("sb-"));

  const res = new NextResponse();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) =>
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  );

  const { data: userFromCookie, error: cookieErr } = await supabase.auth.getUser();

  return NextResponse.json({
    cookieNames,
    supabaseCookieCount: supabaseCookies.length,
    supabaseCookieNames: supabaseCookies.map(c => c.name),
    userFromCookie: userFromCookie?.user?.email ?? null,
    cookieAuthError: cookieErr?.message ?? null,
    host: req.headers.get("host"),
  });
}
