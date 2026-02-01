import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  // If no code, just go login
  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const supabase = await supabaseServer();

  // Exchange code -> session (sets cookies via your server client)
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // If exchange fails, go login with an error
  if (error) {
    const to = new URL("/login", url.origin);
    to.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(to);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
