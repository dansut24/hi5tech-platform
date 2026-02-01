// apps/app/src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=missing_code`, url));
  }

  const supabase = await supabaseServer();
  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(new URL(next, url));
}
