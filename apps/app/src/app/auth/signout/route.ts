// apps/app/src/app/auth/signout/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await supabaseServer();

  // Clear Supabase auth cookies
  await supabase.auth.signOut();

  // Redirect back to login (same tenant host)
  const url = new URL(req.url);
  const redirectTo = new URL("/login", url.origin);

  return NextResponse.redirect(redirectTo);
}

// Optional: allow POST too (handy if a button submits a form)
export async function POST(req: Request) {
  return GET(req);
}
