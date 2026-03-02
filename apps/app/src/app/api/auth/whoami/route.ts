import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function GET(req: NextRequest) {
  const token = getBearer(req);
  if (!token || token === "null" || token === "undefined") {
    return NextResponse.json(
      { ok: false, error: "Missing/invalid bearer token value", tokenValue: token ?? null },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Invalid session", hasUser: false },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { ok: true, user: { id: data.user.id, email: data.user.email } },
    { status: 200 }
  );
}
