import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.length) {
    return NextResponse.json([]);
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const tenantId = url.searchParams.get("tenant_id")?.trim();

  const allowedTenantIds = tenantId && tenantIds.includes(tenantId)
    ? [tenantId]
    : tenantIds;

  let query = supabase
    .from("devices")
    .select("device_id, tenant_id, hostname, os, arch, online, last_seen_at, updated_at")
    .in("tenant_id", allowedTenantIds)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (q) {
    query = query.or(
      `device_id.ilike.%${q}%,hostname.ilike.%${q}%,os.ilike.%${q}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data ?? []);
}
