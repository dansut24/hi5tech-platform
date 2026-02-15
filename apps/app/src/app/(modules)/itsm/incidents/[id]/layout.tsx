import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import IncidentDetailFrame from "./IncidentDetailFrame";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";

type Incident = {
  id: string;
  tenant_id: string;
  number?: string | number | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  triage_status?: string | null;
  requester_id?: string | null;
  assignee_id?: string | null;
  assigned_team_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const dynamic = "force-dynamic";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: any;
}) {
  const p = await params;
  const raw = String(p?.id ?? "").trim();

  const supabase = await supabaseServer();

  const tenantIds = await getMemberTenantIds();
  if (!tenantIds.length) redirect("/itsm/incidents");

  // Try by UUID first, otherwise by (tenant_id, number)
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw
    );

  let incident: Incident | null = null;

  if (isUuid) {
    const { data } = await supabase
      .from("incidents")
      .select(
        [
          "id",
          "tenant_id",
          "number",
          "title",
          "description",
          "category",
          "status",
          "priority",
          "triage_status",
          "requester_id",
          "assignee_id",
          "assigned_team_id",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("id", raw)
      .in("tenant_id", tenantIds)
      .maybeSingle();

    incident = (data as any) ?? null;
  }

  // If not found by UUID, try number across tenant memberships
  if (!incident) {
    const { data } = await supabase
      .from("incidents")
      .select(
        [
          "id",
          "tenant_id",
          "number",
          "title",
          "description",
          "category",
          "status",
          "priority",
          "triage_status",
          "requester_id",
          "assignee_id",
          "assigned_team_id",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .in("tenant_id", tenantIds)
      .eq("number", raw)
      .maybeSingle();

    incident = (data as any) ?? null;
  }

  if (!incident) {
    redirect("/itsm/incidents");
  }

  return (
    <IncidentDetailFrame
      incidentId={incident.id}
      tenantId={incident.tenant_id}
      number={incident.number ? String(incident.number) : raw}
      title={incident.title ?? "Untitled incident"}
      status={incident.status ?? null}
      priority={incident.priority ?? null}
      triageStatus={incident.triage_status ?? null}
      assigneeId={incident.assignee_id ?? null}
      assignedTeamId={incident.assigned_team_id ?? null}
    >
      {children}
    </IncidentDetailFrame>
  );
}
