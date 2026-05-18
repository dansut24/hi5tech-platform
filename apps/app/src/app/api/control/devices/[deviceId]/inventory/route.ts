import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const RMM_API_BASE =
  process.env.NEXT_PUBLIC_RMM_API_BASE?.replace(/\/+$/, "") ||
  "https://rmm.hi5tech.co.uk";

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

function toInventoryRow(tenantId: string, deviceId: string, inventory: any) {
  return {
    tenant_id: tenantId,
    device_id: deviceId,
    summary: inventory?.summary ?? {},
    hardware: inventory?.hardware ?? {},
    os: inventory?.os ?? {},
    cpu: inventory?.cpu ?? {},
    memory: inventory?.memory ?? {},
    storage: inventory?.storage ?? [],
    security: inventory?.security ?? {},
    network: inventory?.network ?? {},
    sessions: inventory?.sessions ?? {},
    displays: inventory?.displays ?? [],
    battery: inventory?.battery ?? {},
    agent: inventory?.agent ?? {},
    health: inventory?.health ?? {},
    software_summary: inventory?.software_summary ?? {},
    services_summary: inventory?.services_summary ?? {},
    events_summary: inventory?.events_summary ?? {},
    collected_at: inventory?.collected_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

  try {
    const upstream = await fetch(
      `${RMM_API_BASE}/api/devices/${encodeURIComponent(deviceId)}/inventory`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "X-Tenant-ID": resolved.tenantId,
          "X-User-ID": resolved.user.id,
        },
      }
    );

    if (upstream.ok) {
      const json = await upstream.json().catch(() => null);
      const inventory = json?.inventory ?? null;

      if (inventory) {
        const row = toInventoryRow(resolved.tenantId, deviceId, inventory);
        const { error: syncError } = await admin
          .from("device_inventory")
          .upsert(row, { onConflict: "tenant_id,device_id" });

        if (syncError) {
          console.error("[control/inventory] Supabase sync failed", syncError.message);
        }

        return NextResponse.json(
          { inventory: row },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }
  } catch (err) {
    console.error("[control/inventory] upstream fetch failed", err);
  }

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
