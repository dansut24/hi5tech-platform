// apps/app/src/app/api/control/devices/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const UPSTREAM = "https://rmm.hi5tech.co.uk/api/devices";

export async function GET(req: Request) {
  // 1. Require a valid authenticated session
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Resolve which tenant to query.
  //    Accepts an optional ?tenant_id= query param; falls back to the user's first membership.
  const url = new URL(req.url);
  const requestedTenantId = url.searchParams.get("tenant_id") ?? null;

  let memberTenantIds: string[];
  try {
    memberTenantIds = await getMemberTenantIds();
  } catch {
    return NextResponse.json({ error: "Could not resolve tenant membership" }, { status: 403 });
  }

  if (!memberTenantIds.length) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  // Validate the requested tenant ID is one the user actually belongs to.
  let tenantId: string;
  if (requestedTenantId) {
    if (!memberTenantIds.includes(requestedTenantId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    tenantId = requestedTenantId;
  } else {
    tenantId = memberTenantIds[0];
  }

  // 3. Forward to the upstream Go RMM server with the validated tenant ID.
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(UPSTREAM, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Tenant-ID": tenantId,
        "X-User-ID": user.id,
      },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[control/devices] upstream fetch failed:", err);
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
