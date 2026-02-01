// apps/app/src/app/api/auth/verify-invite/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { token_hash, type, next } = await req.json();

  if (!token_hash) {
    return NextResponse.json({ error: "Missing token_hash" }, { status: 400 });
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type || "invite",
  });

  if (error || !data?.session) {
    return NextResponse.json(
      { error: error?.message || "Invite token invalid or expired" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    redirect: next || "/auth/set-password",
  });
}
