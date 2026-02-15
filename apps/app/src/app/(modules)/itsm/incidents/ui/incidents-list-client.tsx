"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

type Team = { id: string; tenant_id: string; name: string };
type Row = {
  id: string;
  tenant_id: string;
  number: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  triage_status: string | null;
  assignee_id: string | null;
  assigned_team_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function IncidentsListClient({
  rows,
  meId,
  teams,
}: {
  rows: Row[];
  meId: string | null;
  teams: Team[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const teamsByTenant = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const t of teams) {
      const arr = map.get(t.tenant_id) ?? [];
      arr.push(t);
      map.set(t.tenant_id, arr);
    }
    // stable ordering
    for (const [k, arr] of map) arr.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [teams]);

  async function assign(incidentId: string, payload: any) {
    setBusyId(incidentId);
    try {
      const res = await fetch("/api/itsm/incidents/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId, ...payload }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed"));
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to update assignment");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="hi5-card overflow-hidden">
      <div className="divide-y hi5-divider">
        {rows.map((r) => {
          const href = `/itsm/incidents/${encodeURIComponent(String(r.number ?? r.id))}`;

          const canAssignToMe = !!meId && (!r.assignee_id || r.assignee_id !== meId);
          const tenantTeams = teamsByTenant.get(r.tenant_id) ?? [];

          return (
            <div key={r.id} className="p-4 hover:bg-black/5 dark:hover:bg-white/5 transition">
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
                      <Badge>{r.status ?? "—"}</Badge>
                      <Badge>{r.priority ?? "—"}</Badge>
                      <Badge>{r.triage_status ?? "—"}</Badge>
                      <Badge>{r.assignee_id ? "Assigned" : "Unassigned"}</Badge>
                    </div>
                  </div>
                </Link>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Link href={href} className="hi5-btn-ghost text-sm w-auto">
                      Open
                    </Link>

                    <button
                      type="button"
                      className="hi5-btn-primary text-sm w-auto"
                      disabled={!canAssignToMe || busyId === r.id}
                      onClick={() => assign(r.id, { mode: "assign_to_me" })}
                    >
                      {busyId === r.id ? "Assigning…" : "Assign to me"}
                    </button>
                  </div>

                  {/* Assign to team */}
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-2xl border hi5-border hi5-card px-3 py-2 text-sm outline-none"
                      value={r.assigned_team_id ?? ""}
                      disabled={busyId === r.id || tenantTeams.length === 0}
                      onChange={(e) => {
                        const teamId = e.target.value || null;
                        assign(r.id, {
                          mode: teamId ? "assign_team" : "unassign",
                          assigned_team_id: teamId,
                        });
                      }}
                    >
                      <option value="">
                        {tenantTeams.length ? "Unassigned team" : "No teams"}
                      </option>
                      {tenantTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="hi5-btn-ghost text-sm w-auto"
                      disabled={busyId === r.id}
                      onClick={() => assign(r.id, { mode: "unassign" })}
                    >
                      Unassign
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!rows.length ? (
          <div className="p-4 text-sm opacity-70">No incidents found.</div>
        ) : null}
      </div>
    </div>
  );
}
