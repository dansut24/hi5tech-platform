import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subdomain = (searchParams.get("subdomain") || "").toLowerCase().trim();

  if (!subdomain) {
    return NextResponse.json({ exists: false });
  }

  const supabase = await supabaseServer();

  // We check “tenants” by (domain, subdomain).
  // If your schema differs, adjust this query.
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", ROOT_DOMAIN)
    .eq("subdomain", subdomain)
    .eq("is_active", true)
    .limit(1);

  if (error) {
    // don’t break middleware; just fail closed = false
    return NextResponse.json({ exists: false, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ exists: (data?.length ?? 0) > 0 });
}
