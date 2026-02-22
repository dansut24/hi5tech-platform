"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import DetailShell from "../../_components/ui/DetailShell";
import DetailTabs from "../../_components/ui/DetailTabs";
import StatusStepper from "../../_components/ui/StatusStepper";
import RailCard from "../../_components/ui/RailCard";
import { ActionPill, IconChip } from "../../_components/ui/ActionControls";
import { useToast } from "@/components/ui/toast";

import {
  ChevronRight,
  ArrowUpRight,
  Bell,
  User,
  MessageSquare,
  FileText,
  UserCheck,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
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
  const router = useRouter();
  const tab = sp.get("tab") ?? "overview";
  const { success, error } = useToast();

  const baseHref = pathname;

  const tabs = [
    { key: "overview", label: "Overview", href: `${baseHref}?tab=overview` },
    { key: "updates", label: "Updates", href: `${baseHref}?tab=updates` },
    { key: "files", label: "Files", href: `${baseHref}?tab=files` },
  ];

  const [busy, setBusy] = useState(false);
  // On mobile, the workflow rail is collapsible
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const statusValue = (status ?? "Open") as Status;
  const priorityValue = (priority ?? "Medium") as Priority;

  const statusOptions: Status[] = ["Open", "In Progress", "Resolved", "Closed"];
  const priorityOptions: Priority[] = ["Low", "Medium", "High", "Critical"];

  async function post(url: string, body: any, toastLabel?: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed"));
      success(toastLabel ?? "Updated", "Incident updated successfully");
      router.refresh();
    } catch (e: any) {
      error("Update failed", e?.message ?? "Please try again");
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

  // Shared workflow panel content
  const WorkflowContent = () => (
    <div className="space-y-3">
      {/* Status stepper */}
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
                post(
                  "/api/itsm/incidents/update",
                  { incident_id: incidentId, patch: { status: e.target.value } },
                  "Status updated"
                )
              }
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
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
                post(
                  "/api/itsm/incidents/update",
                  { incident_id: incidentId, patch: { priority: e.target.value } },
                  "Priority updated"
                )
              }
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="hi5-btn-primary text-sm w-auto flex items-center gap-2"
            disabled={busy}
            onClick={() =>
              post(
                "/api/itsm/incidents/assign",
                { incident_id: incidentId, mode: "assign_to_me" },
                "Assigned to you"
              )
            }
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Assign to me
          </button>

          <button
            type="button"
            className="hi5-btn-ghost text-sm w-auto flex items-center gap-2"
            disabled={busy}
            onClick={() => router.refresh()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </RailCard>

      <RailCard title="Actions">
        <div className="flex flex-col gap-2">
          <Link href={`${baseHref}?tab=updates`} className="hi5-btn-ghost text-sm w-auto flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Add update
          </Link>
          <Link href={`${baseHref}?tab=files`} className="hi5-btn-ghost text-sm w-auto flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Attach file
          </Link>
        </div>
      </RailCard>

      <div className="hi5-card p-4 text-xs opacity-60 space-y-1">
        <div>tenant: <span className="font-mono">{tenantId}</span></div>
        <div>assignee: <span className="font-mono">{assigneeId ?? "—"}</span></div>
        <div>team: <span className="font-mono">{assignedTeamId ?? "—"}</span></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <DetailShell
        title={
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/itsm/incidents"
              className="text-sm opacity-70 hover:opacity-100 transition shrink-0"
            >
              Incidents
            </Link>
            <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
            <span className="truncate text-sm">
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

        {/* Mobile workflow toggle */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setWorkflowOpen((v) => !v)}
            className="w-full hi5-card p-3 flex items-center justify-between text-sm font-semibold"
          >
            <span>Workflow & Actions</span>
            {workflowOpen ? <ChevronUp size={16} className="opacity-60" /> : <ChevronDown size={16} className="opacity-60" />}
          </button>
          {workflowOpen && (
            <div className="mt-2 space-y-3">
              <WorkflowContent />
            </div>
          )}
        </div>

        {/* Desktop: side-by-side layout */}
        <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">{children}</div>

          {/* Desktop workflow rail — always visible */}
          <div className="hidden lg:block space-y-3">
            <WorkflowContent />
          </div>
        </div>
      </DetailShell>
    </div>
  );
}
