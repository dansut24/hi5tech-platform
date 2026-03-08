import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  
  const { token } = await req.json();

  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseKey,
    },
  });

  const body = await authRes.json();
  
  return NextResponse.json({
    status: authRes.status,
    ok: authRes.ok,
    userId: body?.id ?? null,
    email: body?.email ?? null,
    error: body?.error ?? body?.message ?? null,
    urlUsed: `${supabaseUrl}/auth/v1/user`,
    keyEnd: supabaseKey.slice(-10),
  });
}
