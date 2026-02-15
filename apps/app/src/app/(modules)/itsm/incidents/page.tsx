import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";
import { getMyTeamIdsForTenants } from "@/lib/teams";
import IncidentsToolbarClient from "./ui/incidents-toolbar-client";
import IncidentsListClient from "./ui/incidents-list-client";

type ViewMode = "triage" | "mine" | "team" | "all";

export default async function IncidentsList({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const supabase = await supabaseServer();
  const tenantIds = await getMemberTenantIds();

  const { data: ures } = await supabase.auth.getUser();
  const me = ures.user;

  const view = (searchParams?.view as ViewMode) || "triage";

  if (!tenantIds.length) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Incidents</h1>
            <p className="text-sm opacity-70">No tenant memberships found.</p>
          </div>

          <Link
            href="/itsm/incidents/new"
            className="rounded-xl px-4 py-2 text-sm font-medium hi5-accent-btn self-start"
          >
            New incident
          </Link>
        </div>

        <div className="hi5-card p-4 text-sm opacity-80">
          You don’t belong to any tenants yet.
        </div>
      </div>
    );
  }

  // ✅ Load "my teams" (scoped to tenants)
  const myTeamIds = await getMyTeamIdsForTenants(tenantIds);

  // ✅ Load teams for those tenants (for the dropdown)
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, tenant_id, name")
    .in("tenant_id", tenantIds)
    .order("name", { ascending: true });

  if (teamsErr) {
    return (
      <div className="hi5-card p-4 text-sm text-red-600">
        Failed to load teams: {teamsErr.message}
      </div>
    );
  }

  // ✅ Counts (fast + exact) for the tabs
  const [{ count: triageCount }, { count: mineCount }, { count: teamCount }, { count: allCount }] =
    await Promise.all([
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .in("tenant_id", tenantIds)
        .eq("triage_status", "triage")
        .is("assignee_id", null)
        .in("assigned_team_id", myTeamIds.length ? myTeamIds : ["00000000-0000-0000-0000-000000000000"]),
      me?.id
        ? supabase
            .from("incidents")
            .select("id", { count: "exact", head: true })
            .in("tenant_id", tenantIds)
            .eq("assignee_id", me.id)
        : supabase.from("incidents").select("id", { count: "exact", head: true }).eq("id", "00000000-0000-0000-0000-000000000000"),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .in("tenant_id", tenantIds)
        .in("assigned_team_id", myTeamIds.length ? myTeamIds : ["00000000-0000-0000-0000-000000000000"]),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .in("tenant_id", tenantIds),
    ]);

  // ✅ Base query for rows
  let q = supabase
    .from("incidents")
    .select(
      [
        "id",
        "tenant_id",
        "number",
        "title",
        "status",
        "priority",
        "created_at",
        "updated_at",
        "triage_status",
        "assignee_id",
        "assigned_team_id",
      ].join(",")
    )
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false })
    .limit(200);

  // ✅ Real filters
  if (view === "triage") {
    // Service Desk view: only incidents routed to my teams, unassigned, in triage
    q = q
      .eq("triage_status", "triage")
      .is("assignee_id", null)
      .in("assigned_team_id", myTeamIds.length ? myTeamIds : ["00000000-0000-0000-0000-000000000000"]);
  } else if (view === "mine") {
    q = me?.id
      ? q.eq("assignee_id", me.id)
      : q.eq("id", "00000000-0000-0000-0000-000000000000");
  } else if (view === "team") {
    q = q.in("assigned_team_id", myTeamIds.length ? myTeamIds : ["00000000-0000-0000-0000-000000000000"]);
  } else {
    // all: no extra filters
  }

  const { data: rows, error } = await q;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-sm opacity-70">Service Desk workflow: triage → assign → resolve.</p>
        </div>

        <Link
          href="/itsm/incidents/new"
          className="rounded-xl px-4 py-2 text-sm font-medium hi5-accent-btn self-start"
        >
          New incident
        </Link>
      </div>

      <IncidentsToolbarClient
        currentView={view}
        counts={{
          triage: triageCount ?? 0,
          mine: mineCount ?? 0,
          team: teamCount ?? 0,
          all: allCount ?? 0,
        }}
      />

      {error ? (
        <div className="hi5-card p-4 text-sm text-red-600">{error.message}</div>
      ) : null}

      <IncidentsListClient rows={(rows ?? []) as any} meId={me?.id ?? null} teams={(teams ?? []) as any} />
    </div>
  );
}
