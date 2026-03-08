import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function GET(req: NextRequest) {
  const allCookies = req.cookies.getAll();
  const supabaseCookies = allCookies.filter(c => c.name.startsWith("sb-"));

  // Show raw values so we can see exact format
  const cookieDetail = supabaseCookies.map(c => ({
    name: c.name,
    length: c.value.length,
    prefix: c.value.slice(0, 40),
    startsWithBase64: c.value.startsWith("base64-"),
  }));

  // Try to decode the base64 cookie manually if present
  const mainCookie = allCookies.find(c => c.name.match(/sb-.+-auth-token$/) && !c.name.includes("."));
  let decoded: any = null;
  if (mainCookie?.value?.startsWith("base64-")) {
    try {
      const raw = Buffer.from(mainCookie.value.slice(7), "base64").toString("utf8");
      decoded = JSON.parse(raw);
      decoded.access_token = decoded.access_token?.slice(0, 20) + "..."; // truncate for safety
      decoded.refresh_token = decoded.refresh_token?.slice(0, 10) + "...";
    } catch (e: any) {
      decoded = { error: e.message };
    }
  }

  // Try standard SSR auth
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

  // Try manually setting session from decoded cookie
  let userFromManual = null;
  let manualErr = null;
  if (decoded?.access_token && !decoded.error) {
    try {
      const mainCookieFull = allCookies.find(c => c.name.match(/sb-.+-auth-token$/) && !c.name.includes("."));
      const raw = Buffer.from(mainCookieFull!.value.slice(7), "base64").toString("utf8");
      const session = JSON.parse(raw);

      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      userFromManual = data?.user?.email ?? null;
      manualErr = error?.message ?? null;
    } catch (e: any) {
      manualErr = e.message;
    }
  }

  return NextResponse.json({
    cookieDetail,
    decoded,
    ssrAuth: {
      user: userFromCookie?.user?.email ?? null,
      error: cookieErr?.message ?? null,
    },
    manualAuth: {
      user: userFromManual,
      error: manualErr,
    },
    host: req.headers.get("host"),
    middlewareRan: allCookies.some(c => c.name.includes(".0")),
  });
}
