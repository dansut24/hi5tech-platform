import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const UPSTREAM_BASE = "https://rmm.hi5tech.co.uk/api/devices";

type UpstreamDevice = {
  device_id?: string;
  id?: string;
  hostname?: string;
  os?: string;
  arch?: string;
  last_seen_at?: string;
  online?: boolean;
};

async function resolveTenant(req: Request) {
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const url = new URL(req.url);
  const requestedTenantId = url.searchParams.get("tenant_id") ?? req.headers.get("X-Tenant-ID");

  const memberTenantIds = await getMemberTenantIds();

  if (!memberTenantIds.length) {
    return { error: NextResponse.json({ error: "No tenant membership found" }, { status: 403 }) };
  }

  if (requestedTenantId && !memberTenantIds.includes(requestedTenantId)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    user,
    tenantId: requestedTenantId ?? memberTenantIds[0],
  };
}

async function syncDevicesToSupabase(tenantId: string, devices: UpstreamDevice[]) {
  const admin = supabaseAdmin();

  const rows = devices
    .map((d) => ({
      device_id: String(d.device_id ?? d.id ?? "").trim(),
      tenant_id: tenantId,
      hostname: d.hostname ?? null,
      os: d.os ?? null,
      arch: d.arch ?? null,
      online: d.online === true,
      last_seen_at: d.last_seen_at ?? null,
      updated_at: new Date().toISOString(),
    }))
    .filter((d) => d.device_id.length > 0);

  if (!rows.length) return;

  const { error } = await admin
    .from("devices")
    .upsert(rows, {
      onConflict: "device_id",
    });

  if (error) {
    console.error("[control/devices] Supabase sync failed:", error.message);
  }
}

export async function GET(req: Request) {
  const resolved = await resolveTenant(req);
  if ("error" in resolved) return resolved.error;

  let upstreamRes: Response;

  try {
    upstreamRes = await fetch(UPSTREAM_BASE, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Tenant-ID": resolved.tenantId,
        "X-User-ID": resolved.user.id,
      },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[control/devices/list] upstream fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach device service" }, { status: 502 });
  }

  const json = await upstreamRes.json().catch(() => null);

  if (!upstreamRes.ok) {
    return NextResponse.json(json ?? { error: "Device service error" }, { status: upstreamRes.status });
  }

  const devices = Array.isArray(json) ? json : Array.isArray(json?.devices) ? json.devices : [];

  await syncDevicesToSupabase(resolved.tenantId, devices);

  return NextResponse.json(devices, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
