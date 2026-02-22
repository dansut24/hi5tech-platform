'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Clock,
  User,
  Users,
  ChevronRight,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

function fmt(ts?: string | null) {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  } catch {
    return ts ?? "-";
  }
}

function priorityConfig(priority: string | null) {
  const p = (priority ?? "").toLowerCase();
  if (p === "critical") return { dot: "bg-rose-500", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20" };
  if (p === "high") return { dot: "bg-orange-500", bg: "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20" };
  if (p === "medium") return { dot: "bg-amber-500", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20" };
  return { dot: "bg-slate-400", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20" };
}

function statusConfig(status: string | null) {
  const s = (status ?? "").toLowerCase().replace(/ /g, "_");
  if (s === "open") return "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20";
  if (s === "in_progress") return "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20";
  if (s === "resolved") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20";
  if (s === "closed") return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  return "bg-slate-500/10 text-slate-500 border-slate-500/20";
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        className ?? "hi5-border opacity-80",
      ].join(" ")}
    >
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

function IncidentCard({
  r,
  meId,
  tenantTeams,
  onAssign,
  busyId,
}: {
  r: Row;
  meId: string | null;
  tenantTeams: Team[];
  onAssign: (incidentId: string, payload: any) => Promise<void>;
  busyId: string | null;
}) {
  const href = `/itsm/incidents/${encodeURIComponent(String(r.number ?? r.id))}`;
  const busy = busyId === r.id;
  const canAssignToMe = !!meId && (!r.assignee_id || r.assignee_id !== meId);
  const pri = priorityConfig(r.priority);
  const statCls = statusConfig(r.status);

  return (
    <div className="hi5-card p-0 overflow-hidden">
      {/* Priority stripe */}
      <div className={["h-1 w-full rounded-t-[20px]", pri.dot].join(" ")} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Number + title */}
            <Link href={href} className="block group">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0 opacity-50" />
                <div className="min-w-0">
                  <span className="text-xs font-mono opacity-50 mr-1.5">{r.number ?? "-"}</span>
                  <span className="text-sm font-semibold group-hover:text-[rgb(var(--hi5-accent))] transition line-clamp-2">
                    {r.title ?? "Untitled incident"}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Open chevron */}
          <Link
            href={href}
            className="shrink-0 h-9 w-9 rounded-xl border hi5-border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition"
            aria-label="Open incident"
          >
            <ChevronRight size={16} />
          </Link>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge className={statCls}>
            {(r.status ?? "-").replace(/_/g, " ")}
          </Badge>
          <Badge className={pri.bg}>
            <span className={["h-1.5 w-1.5 rounded-full", pri.dot].join(" ")} />
            {r.priority ?? "-"}
          </Badge>
          {r.triage_status && (
            <Badge>{r.triage_status.replace(/_/g, " ")}</Badge>
          )}
          <Badge className={r.assignee_id ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20"}>
            {r.assignee_id ? "Assigned" : "Unassigned"}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 text-xs opacity-50">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {fmt(r.created_at)}
          </span>
          {r.updated_at && r.updated_at !== r.created_at && (
            <span className="flex items-center gap-1">
              Updated {fmt(r.updated_at)}
            </span>
          )}
        </div>

        {/* Actions row - stacked on mobile, inline on sm+ */}
        <div className="mt-4 pt-3 border-t hi5-divider flex flex-col sm:flex-row gap-2">
          {/* Assign to me */}
          <button
            type="button"
            className="hi5-btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
            disabled={!canAssignToMe || busy}
            onClick={() => onAssign(r.id, { mode: "assign_to_me" })}
          >
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <UserCheck size={13} />
            )}
            {busy ? "Assigning..." : "Assign to me"}
          </button>

          {/* Team assignment */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
              <select
                className="hi5-input text-xs pl-8 py-2 pr-8 appearance-none"
                value={r.assigned_team_id ?? ""}
                disabled={busy || tenantTeams.length === 0}
                onChange={(e) => {
                  const teamId = e.target.value || null;
                  onAssign(r.id, {
                    mode: teamId ? "assign_team" : "unassign",
                    assigned_team_id: teamId,
                  });
                }}
              >
                <option value="">{tenantTeams.length ? "No team" : "No teams"}</option>
                {tenantTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {r.assignee_id && (
              <button
                type="button"
                className="hi5-btn-ghost text-xs py-2 px-3 shrink-0 flex items-center gap-1"
                disabled={busy}
                onClick={() => onAssign(r.id, { mode: "unassign" })}
                title="Unassign"
              >
                <UserX size={13} />
                <span className="hidden sm:inline">Unassign</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton card for loading state
function IncidentCardSkeleton() {
  return (
    <div className="hi5-card p-0 overflow-hidden animate-pulse">
      <div className="h-1 w-full rounded-t-[20px] bg-slate-200 dark:bg-slate-700" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl mt-4" />
      </div>
    </div>
  );
}

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
  const router = useRouter();
  const { success, error } = useToast();

  const teamsByTenant = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const t of teams) {
      const arr = map.get(t.tenant_id) ?? [];
      arr.push(t);
      map.set(t.tenant_id, arr);
    }
    for (const [, arr] of map) arr.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [teams]);

  async function onAssign(incidentId: string, payload: any) {
    setBusyId(incidentId);
    try {
      const res = await fetch("/api/itsm/incidents/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId, ...payload }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed"));

      const actionLabel =
        payload.mode === "assign_to_me"
          ? "Assigned to you"
          : payload.mode === "assign_team"
          ? "Team assigned"
          : "Unassigned";
      success(actionLabel, "Incident updated successfully");
      router.refresh();
    } catch (e: any) {
      error("Assignment failed", e?.message ?? "Please try again");
    } finally {
      setBusyId(null);
    }
  }

  if (!rows.length) {
    return (
      <div className="hi5-card p-10 flex flex-col items-center gap-3 text-center">
        <AlertCircle size={32} className="opacity-30" />
        <div className="text-sm font-semibold opacity-70">No incidents found</div>
        <div className="text-xs opacity-50">
          No incidents match the current filter.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <IncidentCard
          key={r.id}
          r={r}
          meId={meId}
          tenantTeams={teamsByTenant.get(r.tenant_id) ?? []}
          onAssign={onAssign}
          busyId={busyId}
        />
      ))}
    </div>
  );
}

// Export skeleton for use in loading.tsx if needed
export { IncidentCardSkeleton };
