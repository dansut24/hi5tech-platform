import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const UPSTREAM_BASE = "https://rmm.hi5tech.co.uk/api/devices";

async function resolveTenant(req: Request) {
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const url = new URL(req.url);
  const requestedTenantId = url.searchParams.get("tenant_id") ?? req.headers.get("X-Tenant-ID");

  let memberTenantIds: string[];
  try {
    memberTenantIds = await getMemberTenantIds();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Could not resolve tenant membership" },
        { status: 403 }
      ),
    };
  }

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

  const text = await upstreamRes.text();

  return new NextResponse(text, {
    status: upstreamRes.status,
    headers: {
      "Content-Type": upstreamRes.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
