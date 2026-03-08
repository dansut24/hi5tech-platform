import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Body = {
  tenant_id: string;
  title: string;
  description: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  asset_tag?: string | null;
};

function clean(s: unknown) {
  return String(s ?? "").trim();
}

async function generateIncidentNumber(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  tenantId: string
): Promise<{ number: string; error: string | null }> {
  const { data, error } = await supabase.rpc("next_tenant_counter", {
    p_tenant_id: tenantId,
    p_counter_name: "incidents",
  });

  if (error || data == null) {
    return { number: "", error: error?.message ?? "Counter RPC returned null" };
  }

  const number = `INC-${String(data).padStart(5, "0")}`;
  return { number, error: null };
}

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

  const tenantId    = clean(body.tenant_id);
  const title       = clean(body.title);
  const description = clean(body.description);
  const category    = clean(body.category);
  const priority    = body.priority;

  if (!tenantId)    return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
  if (!title)       return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });
  if (!category)    return NextResponse.json({ error: "category is required" }, { status: 400 });

  if (title.length > 255)
    return NextResponse.json({ error: "title must be 255 characters or fewer" }, { status: 400 });
  if (description.length > 10000)
    return NextResponse.json({ error: "description must be 10,000 characters or fewer" }, { status: 400 });

  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.includes(tenantId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("default_service_desk_team_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const defaultTeamId =
    (settings as { default_service_desk_team_id?: string | null } | null)
      ?.default_service_desk_team_id ?? null;

  const { number, error: counterError } = await generateIncidentNumber(supabase, tenantId);
  if (counterError) {
    console.error("[incidents/create] counter error:", counterError);
    return NextResponse.json({ error: "Failed to generate incident number" }, { status: 500 });
  }

  const { data: created, error: createErr } = await supabase
    .from("incidents")
    .insert({
      tenant_id:        tenantId,
      number,
      title,
      description,
      category,
      priority,
      status:           "Open",
      triage_status:    "triage",
      assigned_team_id: defaultTeamId,
      requester_id:     user.id,
      submitted_by:     user.email ?? user.id,
      asset_tag:        clean(body.asset_tag) || null,
    })
    .select("id, number")
    .maybeSingle();

  if (createErr) {
    console.error("[incidents/create] insert error:", createErr.message);
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, incident: created });
}
