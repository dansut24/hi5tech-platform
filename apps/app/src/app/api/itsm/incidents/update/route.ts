import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Body = {
  incident_id: string;
  patch: Record<string, any>;
};

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const { data: ures } = await supabase.auth.getUser();
  const user = ures.user;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incidentId = String(body.incident_id || "").trim();
  const patch = body.patch ?? {};

  if (!incidentId) return NextResponse.json({ error: "incident_id is required" }, { status: 400 });
  if (!patch || typeof patch !== "object") return NextResponse.json({ error: "patch is required" }, { status: 400 });

  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.length) return NextResponse.json({ error: "No tenant membership" }, { status: 403 });

  const { data: incident, error: readErr } = await supabase
    .from("incidents")
    .select("id, tenant_id")
    .eq("id", incidentId)
    .maybeSingle();

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 400 });
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  if (!tenantIds.includes(incident.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // allow-list fields (prevents accidental overwrites)
  const allowed = new Set(["status", "priority", "triage_status", "resolution_notes"]);
  const safePatch: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (allowed.has(k)) safePatch[k] = v;
  }

  if (!Object.keys(safePatch).length) {
    return NextResponse.json({ error: "No allowed fields provided" }, { status: 400 });
  }

  const { error: upErr } = await supabase.from("incidents").update(safePatch).eq("id", incidentId);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
