import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getMemberTenantIds } from "@/lib/tenant";
import IncidentsToolbarClient from "./ui/incidents-toolbar-client";

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts ?? "—";
  }
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80 whitespace-nowrap">
      {children}
    </span>
  );
}

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

  // Base query
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

  // Apply view filters
  if (view === "triage") {
    q = q.eq("triage_status", "triage").is("assignee_id", null);
  } else if (view === "mine") {
    if (me?.id) q = q.eq("assignee_id", me.id);
    else q = q.eq("id", "00000000-0000-0000-0000-000000000000"); // no rows if not authed
  } else if (view === "team") {
    // For now: show anything assigned to a team OR triage items (later we filter to "my teams")
    q = q.not("assigned_team_id", "is", null);
  } else {
    // all: no extra filters
  }

  const { data: rows, error } = await q;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-sm opacity-70">
            Service Desk workflow: triage → assign → resolve.
          </p>
        </div>

        <Link
          href="/itsm/incidents/new"
          className="rounded-xl px-4 py-2 text-sm font-medium hi5-accent-btn self-start"
        >
          New incident
        </Link>
      </div>

      {/* Tabs + filters (client) */}
      <IncidentsToolbarClient
        currentView={view}
        counts={{
          triage: (rows ?? []).filter((r: any) => r.triage_status === "triage" && !r.assignee_id).length,
          mine: me?.id ? (rows ?? []).filter((r: any) => r.assignee_id === me.id).length : 0,
          team: (rows ?? []).filter((r: any) => !!r.assigned_team_id).length,
          all: (rows ?? []).length,
        }}
      />

      {error ? (
        <div className="hi5-card p-4 text-sm text-red-600">{error.message}</div>
      ) : null}

      {/* List */}
      <div className="hi5-card overflow-hidden">
        <div className="divide-y hi5-divider">
          {(rows ?? []).map((r: any) => {
            const href = `/itsm/incidents/${encodeURIComponent(String(r.number ?? r.id))}`;
            const canAssignToMe = !!me?.id && (!r.assignee_id || r.assignee_id !== me.id);

            return (
              <div
                key={r.id}
                className="p-4 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={href} className="block min-w-0 flex-1">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold truncate">
                        {r.number ?? "—"} • {r.title ?? "Untitled incident"}
                      </div>

                      <div className="text-xs opacity-70">
                        Created: {fmt(r.created_at)}
                        {r.updated_at ? ` • Updated: ${fmt(r.updated_at)}` : null}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge>{String(r.status ?? "—").replace("_", " ")}</Badge>
                        <Badge>{r.priority ?? "—"}</Badge>
                        <Badge>{r.triage_status ?? "—"}</Badge>
                        <Badge>
                          {r.assignee_id ? "Assigned" : "Unassigned"}
                        </Badge>
                      </div>
                    </div>
                  </Link>

                  {/* Quick actions */}
                  <div className="flex items-center gap-2">
                    <Link href={href} className="hi5-btn-ghost text-sm w-auto">
                      Open
                    </Link>

                    <form
                      action={async () => {
                        "use server";
                        // server actions not used here (kept simple)
                      }}
                    />

                    <button
                      type="button"
                      className="hi5-btn-primary text-sm w-auto"
                      disabled={!canAssignToMe}
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/itsm/incidents/assign", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              incident_id: r.id,
                              mode: "assign_to_me",
                            }),
                          });
                          if (!res.ok) throw new Error(await res.text());
                          // quick refresh
                          window.location.reload();
                        } catch (e) {
                          console.error(e);
                          alert("Failed to assign");
                        }
                      }}
                    >
                      Assign to me
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {!rows?.length && !error ? (
            <div className="p-4 text-sm opacity-70">No incidents found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
