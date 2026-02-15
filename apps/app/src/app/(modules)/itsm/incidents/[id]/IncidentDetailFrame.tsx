"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import DetailShell from "../../_components/ui/DetailShell";
import DetailTabs from "../../_components/ui/DetailTabs";
import StatusStepper from "../../_components/ui/StatusStepper";
import RailCard from "../../_components/ui/RailCard";
import { ActionPill, IconChip } from "../../_components/ui/ActionControls";

import {
  ChevronRight,
  ArrowUpRight,
  Bell,
  User,
  MessageSquare,
  FileText,
  UserCheck,
  RefreshCw,
} from "lucide-react";

type Status = "Open" | "In Progress" | "Resolved" | "Closed";
type Priority = "Low" | "Medium" | "High" | "Critical";

export default function IncidentDetailFrame({
  incidentId,
  tenantId,
  number,
  title,
  status,
  priority,
  triageStatus,
  assigneeId,
  assignedTeamId,
  children,
}: {
  incidentId: string;
  tenantId: string;
  number?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  triageStatus?: string | null;
  assigneeId?: string | null;
  assignedTeamId?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "overview";

  const baseHref = pathname;

  const tabs = [
    { key: "overview", label: "Overview", href: `${baseHref}?tab=overview` },
    { key: "updates", label: "Updates", href: `${baseHref}?tab=updates` },
    { key: "files", label: "Files", href: `${baseHref}?tab=files` },
  ];

  const [busy, setBusy] = useState(false);

  const statusValue = (status ?? "Open") as Status;
  const priorityValue = (priority ?? "Medium") as Priority;

  const statusOptions: Status[] = ["Open", "In Progress", "Resolved", "Closed"];
  const priorityOptions: Priority[] = ["Low", "Medium", "High", "Critical"];

  async function post(url: string, body: any) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed"));
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Update failed");
    } finally {
      setBusy(false);
    }
  }

  const subtitleBadges = useMemo(() => {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
          {String(status ?? "—").replaceAll("_", " ")}
        </span>
        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
          {priority ?? "—"}
        </span>
        {triageStatus ? (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
            {triageStatus.replaceAll("_", " ")}
          </span>
        ) : null}
      </div>
    );
  }, [status, priority, triageStatus]);

  return (
    <div className="space-y-3">
      <DetailShell
        title={
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/itsm/incidents"
              className="text-sm opacity-70 hover:opacity-100 transition"
            >
              Incidents
            </Link>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <span className="truncate">
              {number ?? "—"} • {title ?? "Untitled incident"}
            </span>
          </div>
        }
        subtitle={subtitleBadges}
        right={
          <div className="flex items-center gap-2">
            <IconChip title="Notifications">
              <Bell className="h-4 w-4" />
            </IconChip>
            <IconChip title="Profile">
              <User className="h-4 w-4" />
            </IconChip>
          </div>
        }
      >
        <DetailTabs
          items={tabs}
          activeKey={tab}
          right={
            <ActionPill onClick={() => window.open(baseHref, "_blank")}>
              <ArrowUpRight className="h-4 w-4" />
              Open
            </ActionPill>
          }
        />

        <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">{children}</div>

          <div className="space-y-3">
            <StatusStepper value={status} />

            <RailCard title="Workflow">
              <div className="space-y-3">
                <div>
                  <div className="text-xs opacity-70 mb-1">Status</div>
                  <select
                    className="w-full rounded-2xl border hi5-border hi5-card px-3 py-2 text-sm outline-none"
                    value={statusValue}
                    disabled={busy}
                    onChange={(e) =>
                      post("/api/itsm/incidents/update", {
                        incident_id: incidentId,
                        patch: { status: e.target.value },
                      })
                    }
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs opacity-70 mb-1">Priority</div>
                  <select
                    className="w-full rounded-2xl border hi5-border hi5-card px-3 py-2 text-sm outline-none"
                    value={priorityValue}
                    disabled={busy}
                    onChange={(e) =>
                      post("/api/itsm/incidents/update", {
                        incident_id: incidentId,
                        patch: { priority: e.target.value },
                      })
                    }
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="hi5-btn-primary text-sm w-auto"
                  disabled={busy}
                  onClick={() =>
                    post("/api/itsm/incidents/assign", {
                      incident_id: incidentId,
                      mode: "assign_to_me",
                    })
                  }
                >
                  <UserCheck className="h-4 w-4" />
                  Assign to me
                </button>

                <button
                  type="button"
                  className="hi5-btn-ghost text-sm w-auto"
                  disabled={busy}
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </RailCard>

            <RailCard title="Actions">
              <div className="flex flex-col gap-2">
                <Link href={`${baseHref}?tab=updates`} className="hi5-btn-ghost text-sm w-auto">
                  <MessageSquare className="h-4 w-4" />
                  Add update
                </Link>
                <Link href={`${baseHref}?tab=files`} className="hi5-btn-ghost text-sm w-auto">
                  <FileText className="h-4 w-4" />
                  Attach file
                </Link>
              </div>
            </RailCard>

            {/* hidden meta (handy later) */}
            <div className="hi5-card p-4 text-xs opacity-70 space-y-1">
              <div>tenant: <span className="font-mono">{tenantId}</span></div>
              <div>assignee: <span className="font-mono">{assigneeId ?? "—"}</span></div>
              <div>team: <span className="font-mono">{assignedTeamId ?? "—"}</span></div>
            </div>
          </div>
        </div>
      </DetailShell>
    </div>
  );
}
