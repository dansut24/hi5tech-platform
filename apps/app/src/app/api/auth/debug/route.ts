import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING").replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "MISSING";

  // Decode token from browser-format cookie
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

  // Call Supabase auth REST directly from the server
  let directResult: any = null;
  let directError: string | null = null;
  let directStatus: number | null = null;
  if (accessToken) {
    try {
      const endpoint = `${url}/auth/v1/user`;
      const r = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: key,
        },
      });
      directStatus = r.status;
      directResult = await r.json();
    } catch (e: any) {
      directError = e.message;
    }
  }

  return NextResponse.json({
    envUrl: url,
    envKeyLength: key.length,
    envKeyEnd: key.slice(-10),
    hasToken: !!accessToken,
    directStatus,
    directEmail: directResult?.email ?? null,
    directErrorMsg: directResult?.message ?? directResult?.error ?? null,
    directError,
  });
}
