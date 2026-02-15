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

function clean(s: any) {
  return String(s ?? "").trim();
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

  const tenantId = clean(body.tenant_id);
  const title = clean(body.title);
  const description = clean(body.description);
  const category = clean(body.category);
  const priority = body.priority;

  if (!tenantId) return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 });

  // tenant membership check
  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.includes(tenantId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // fetch default service desk team (optional)
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("default_service_desk_team_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const defaultTeamId = (settings as any)?.default_service_desk_team_id ?? null;

  // generate next number per tenant (simple + works; can be improved later with a counter table)
  const { data: latest, error: latestErr } = await supabase
    .from("incidents")
    .select("number")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (latestErr) {
    return NextResponse.json({ error: latestErr.message }, { status: 400 });
  }

  let nextNum = 1;
  for (const r of latest ?? []) {
    const n = parseInt(String((r as any).number ?? "").replace(/\D/g, ""), 10);
    if (!Number.isNaN(n)) nextNum = Math.max(nextNum, n + 1);
  }

  const number = String(nextNum);

  const { data: created, error: createErr } = await supabase
    .from("incidents")
    .insert({
      tenant_id: tenantId,
      number,
      title,
      description,
      category,
      priority,
      status: "Open",
      triage_status: "triage",
      assigned_team_id: defaultTeamId,
      requester_id: user.id,
      submitted_by: user.email ?? user.id,
      asset_tag: clean(body.asset_tag) || null,
    })
    .select("id, number")
    .maybeSingle();

  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, incident: created });
}
