import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function labelForFeature(featureKey: string) {
  return featureKey
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const tenantId = String(body?.tenant_id ?? "").trim();
  const featureKey = String(body?.feature_key ?? "").trim();
  const incidentId = body?.incident_id ? String(body.incident_id).trim() : null;
  const deviceId = body?.device_id ? String(body.device_id).trim() : null;

  if (!tenantId || !featureKey) {
    return NextResponse.json(
      { error: "tenant_id and feature_key are required" },
      { status: 400 }
    );
  }

  const tenantIds = await getMemberTenantIds();

  if (!tenantIds.includes(tenantId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (incidentId) {
    await supabase.from("itsm_activity").insert({
      tenant_id: tenantId,
      entity_type: "incident",
      entity_id: incidentId,
      activity_type: "premium_feature_attempted",
      title: `Premium feature attempted: ${labelForFeature(featureKey)}`,
      body: deviceId
        ? `A user attempted to access ${labelForFeature(featureKey)} for device ${deviceId}.`
        : `A user attempted to access ${labelForFeature(featureKey)}.`,
      metadata: {
        feature_key: featureKey,
        device_id: deviceId,
      },
      created_by: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
