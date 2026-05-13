import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

async function resolveTenant(req: Request) {
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const url = new URL(req.url);
  const requestedTenantId =
    url.searchParams.get("tenant_id") ?? req.headers.get("X-Tenant-ID");

  const memberTenantIds = await getMemberTenantIds();

  if (!memberTenantIds.length) {
    return {
      error: NextResponse.json({ error: "No tenant membership found" }, { status: 403 }),
    };
  }

  if (requestedTenantId && !memberTenantIds.includes(requestedTenantId)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    user,
    tenantId: requestedTenantId ?? memberTenantIds[0],
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await context.params;

  if (!deviceId) {
    return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
  }

  const resolved = await resolveTenant(req);
  if ("error" in resolved) return resolved.error;

  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("device_inventory")
    .select("*")
    .eq("tenant_id", resolved.tenantId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { inventory: data ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
