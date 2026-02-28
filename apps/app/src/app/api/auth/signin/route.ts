import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
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

    const supabase = await supabaseServer();

    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password: p,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // cookies are written by supabaseServer() cookie adapter
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
