import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Body = {
  incident_id: string;
  mode: "assign_to_me" | "assign_team" | "unassign";
  assigned_team_id?: string | null;
  assignee_id?: string | null;
};

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const { data: ures } = await supabase.auth.getUser();
  const user = ures.user;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incidentId = String(body.incident_id || "").trim();
  if (!incidentId) {
    return NextResponse.json({ error: "incident_id is required" }, { status: 400 });
  }

  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.length) {
    return NextResponse.json({ error: "No tenant membership" }, { status: 403 });
  }

  // Load incident (tenant-safe)
  const { data: incident, error: readErr } = await supabase
    .from("incidents")
    .select("id, tenant_id")
    .eq("id", incidentId)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 400 });
  }
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }
  if (!tenantIds.includes(incident.tenant_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Decide update
  const mode = body.mode;

  const patch: Record<string, any> = {};

  if (mode === "assign_to_me") {
    patch.assignee_id = user.id;
    patch.triage_status = "assigned";
    // leave assigned_team_id as-is unless provided
    if (body.assigned_team_id) patch.assigned_team_id = body.assigned_team_id;
  } else if (mode === "assign_team") {
    const teamId = String(body.assigned_team_id || "").trim();
    if (!teamId) {
      return NextResponse.json({ error: "assigned_team_id is required for assign_team" }, { status: 400 });
    }
    patch.assigned_team_id = teamId;

    // optionally set assignee too (if provided)
    if (body.assignee_id) patch.assignee_id = body.assignee_id;

    patch.triage_status = patch.assignee_id ? "assigned" : "triage";
  } else if (mode === "unassign") {
    patch.assignee_id = null;
    patch.triage_status = "triage";
    // keep assigned_team_id (so it goes back to Service Desk queue)
    if (body.assigned_team_id === null) patch.assigned_team_id = null;
  } else {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const { error: upErr } = await supabase
    .from("incidents")
    .update(patch)
    .eq("id", incidentId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
