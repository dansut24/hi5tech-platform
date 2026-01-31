// apps/marketing/src/app/api/signup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getEnv(name: string) {
  const v = process.env[name];
  return v && v.length ? v : null;
}

export async function POST(req: Request) {
  const supabaseUrl =
    getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const serviceRole =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_ROLE");

  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)" },
      { status: 500 }
    );
  }

  if (!serviceRole) {
    return NextResponse.json(
      { error: "Missing env: SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  // IMPORTANT: create the client at request-time, not module-load time
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Your signup logic here...
  const body = await req.json().catch(() => ({}));

  return NextResponse.json({ ok: true, received: body });
}
