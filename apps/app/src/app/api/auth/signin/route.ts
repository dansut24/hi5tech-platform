import { NextResponse, type NextRequest } from "next/server";
import { supabaseRoute } from "@/lib/supabase/route";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true }); // <-- IMPORTANT: cookies get written onto THIS response
  const supabase = supabaseRoute(req, res);

  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    const e = String(email || "").trim().toLowerCase();
    const p = String(password || "");

    if (!e || !p) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // ✅ auth cookies are now attached to `res`
    return res;
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
