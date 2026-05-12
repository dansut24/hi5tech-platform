import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

const RMM_API_BASE =
  process.env.NEXT_PUBLIC_RMM_API_BASE?.replace(/\/+$/, "") ||
  "https://rmm.hi5tech.co.uk";

async function resolveTenant(req: Request) {
  const supabase = await supabaseServer();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await context.params;
  if (!deviceId) {
    return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
  }

  const resolved = await resolveTenant(req);
  if ("error" in resolved) return resolved.error;

  const body = await req.json().catch(() => null);
  const groupIdRaw = body?.group_id === undefined ? undefined : String(body.group_id || "").trim();

  if (groupIdRaw === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const groupId = groupIdRaw && groupIdRaw !== "default" ? groupIdRaw : null;
  const admin = supabaseAdmin();

  if (groupId) {
    const { data: group, error: groupError } = await admin
      .from("device_groups")
      .select("id")
      .eq("tenant_id", resolved.tenantId)
      .eq("id", groupId)
      .is("archived_at", null)
      .maybeSingle();

    if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
    if (!group) return NextResponse.json({ error: "Device group not found" }, { status: 404 });
  }

  const { error } = await admin
    .from("devices")
    .upsert(
      {
        device_id: deviceId,
        tenant_id: resolved.tenantId,
        group_id: groupId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best effort: newer control-server builds may support this endpoint later. Do not
  // fail the UI if the current server does not support PATCH yet.
  fetch(`${RMM_API_BASE}/api/devices/${encodeURIComponent(deviceId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-ID": resolved.tenantId,
      "X-User-ID": resolved.user.id,
    },
    body: JSON.stringify({ group_id: groupId }),
    cache: "no-store",
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, device_id: deviceId, group_id: groupId });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await context.params;

  if (!deviceId) {
    return NextResponse.json({ error: "Missing deviceId" }, { status: 400 });
  }

  const res = await fetch(
    `${RMM_API_BASE}/api/devices/${encodeURIComponent(deviceId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to delete device", details: text },
      { status: res.status }
    );
  }

  return NextResponse.json({ ok: true });
}
