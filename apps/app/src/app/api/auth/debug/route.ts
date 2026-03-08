import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "MISSING";

  // Call Supabase auth directly with the token from the cookie
  const allCookies = req.cookies.getAll();
  const rawCookie = allCookies.find(
    c => c.name.match(/sb-.+-auth-token$/) && !c.name.includes(".")
  );

  let accessToken: string | null = null;
  if (rawCookie?.value?.startsWith("base64-")) {
    try {
      const raw = Buffer.from(rawCookie.value.slice(7), "base64").toString("utf8");
      accessToken = JSON.parse(raw).access_token ?? null;
    } catch { /* ignore */ }
  }

  // Call Supabase REST directly — same as what worked in the browser
  let directResult = null;
  let directError = null;
  if (accessToken) {
    try {
      const r = await fetch(`${url}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: key,
        },
      });
      directResult = await r.json();
    } catch (e: any) {
      directError = e.message;
    }
  }

  return NextResponse.json({
    envUrl: url,
    envKeyLength: key.length,
    envKeyStart: key.slice(0, 20),
    envKeyEnd: key.slice(-10),
    hasToken: !!accessToken,
    tokenStart: accessToken?.slice(0, 20) ?? null,
    directResult: directResult ? { id: directResult.id, email: directResult.email, error: directResult.error } : null,
    directError,
  });
}
