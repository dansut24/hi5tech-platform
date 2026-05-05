import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const incidentId = String(body?.incident_id ?? "").trim();
  const deviceIdRaw = body?.device_id;
  const deviceId =
    deviceIdRaw === null || deviceIdRaw === undefined
      ? null
      : String(deviceIdRaw).trim();

  if (!incidentId) {
    return NextResponse.json({ error: "incident_id is required" }, { status: 400 });
  }

  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.length) {
    return NextResponse.json({ error: "No tenant membership" }, { status: 403 });
  }

  const { data: incident, error: incidentErr } = await supabase
    .from("incidents")
    .select("id, tenant_id")
    .eq("id", incidentId)
    .maybeSingle();

  if (incidentErr) {
    return NextResponse.json({ error: incidentErr.message }, { status: 400 });
  }

  if (!incident || !tenantIds.includes(incident.tenant_id)) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  if (deviceId) {
    const { data: device, error: deviceErr } = await supabase
      .from("devices")
      .select("device_id, tenant_id")
      .eq("tenant_id", incident.tenant_id)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (deviceErr) {
      return NextResponse.json({ error: deviceErr.message }, { status: 400 });
    }

    if (!device) {
      return NextResponse.json({ error: "Device not found in this tenant" }, { status: 404 });
    }
  }

  const { error: updateErr } = await supabase
    .from("incidents")
    .update({
      device_id: deviceId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", incident.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
