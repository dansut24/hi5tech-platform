"use client";

import { ReactNode, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import DetailShell from "../../_components/ui/detail-shell";
import DetailTabs from "../../_components/ui/detail-tabs";
import StatusStepper from "../../_components/ui/status-stepper";
import RailCard from "../../_components/ui/rail-card";
import { ActionPill, IconChip } from "../../_components/ui/action-controls";
import {
  ChevronRight,
  ArrowUpRight,
  Mail,
  UserRoundCog,
  CalendarPlus,
  AlertTriangle,
  Users,
  CheckCircle2,
  Paperclip,
  MessageSquareText,
  Wand2,
  MoreHorizontal,
} from "lucide-react";

type Incident = {
  id: string;
  number?: string | number | null;
  title?: string | null;
  subject?: string | null;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  requester_name?: string | null;
  requester_email?: string | null;

  assignee_name?: string | null;

  response_due_at?: string | null;
  resolution_due_at?: string | null;
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function normalizeStatus(s?: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v.includes("triage") || v.includes("new") || v.includes("open")) return "triage";
  if (v.includes("progress") || v.includes("work") || v.includes("assigned")) return "progress";
  if (v.includes("resolve") || v.includes("closed") || v.includes("done")) return "resolved";
  return "progress";
}

export default function IncidentDetailFrame({
  id,
  incident,
  children,
}: {
  id: string;
  incident: Incident | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "progress";

  const tabs = useMemo(
    () => [
      { label: "Progress", href: `${pathname}?tab=progress` },
      { label: "Related Assets", href: `${pathname}?tab=assets` },
      { label: "AI Insights", href: `${pathname}?tab=ai` },
      { label: "Additional Fields", href: `${pathname}?tab=fields` },
      { label: "View Log", href: `${pathname}?tab=log` },
    ],
    [pathname]
  );

  const incNo = incident?.number
    ? String(incident.number).padStart(6, "0")
    : id?.slice(0, 6) ?? "—";

  const headerTitle = incident?.title || incident?.subject || "Incident details";
  const statusKey = normalizeStatus(incident?.status);
  const activeIndex = statusKey === "triage" ? 0 : statusKey === "progress" ? 1 : 2;

  const header = (
    <div className="px-5 pt-4 pb-3 border-b hi5-divider">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Link href="/itsm/incidents" className="opacity-70 hover:opacity-100 transition truncate">
            Incidents
          </Link>
          <ChevronRight className="h-4 w-4 opacity-40" />
          <span className="opacity-80 truncate">INC-{incNo}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <IconChip
            icon={MessageSquareText}
            title="Comments"
            onClick={() => (window.location.href = `${pathname}?tab=progress#comments`)}
          />
          <IconChip
            icon={Paperclip}
            title="Attachments"
            onClick={() => (window.location.href = `${pathname}?tab=progress#attachments`)}
          />
          <IconChip icon={Wand2} title="AI" onClick={() => (window.location.href = `${pathname}?tab=ai`)} />
          <IconChip icon={MoreHorizontal} title="More" onClick={() => alert("More actions (next patch)")} />
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm opacity-70">[INC-{incNo}]</div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-1 truncate">
            {headerTitle}
          </h1>
          <div className="text-sm opacity-70 mt-1">
            Status: <span className="font-medium opacity-90">{incident?.status ?? "—"}</span>
            {" · "}
            Priority: <span className="font-medium opacity-90">{incident?.priority ?? "—"}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ActionPill icon={ArrowUpRight} label="Escalate" tone="danger" onClick={() => alert("Escalate (next)")} />
          <ActionPill icon={Mail} label="Email user" onClick={() => alert("Email user (next)")} />
          <ActionPill icon={UserRoundCog} label="Re-assign" onClick={() => alert("Re-assign (next)")} />
          <ActionPill icon={CalendarPlus} label="Appointment" onClick={() => alert("Appointment (next)")} />
          <ActionPill icon={AlertTriangle} label="Major incident" tone="danger" onClick={() => alert("Major incident (next)")} />
          <ActionPill icon={Users} label="Log to supplier" onClick={() => alert("Supplier (next)")} />
          <ActionPill icon={CheckCircle2} label="Resolve" tone="primary" onClick={() => alert("Resolve (next)")} />
        </div>
      </div>

      <div className="mt-4">
        <StatusStepper
          stages={[
            { label: "Triage", meta: "" },
            { label: "In Progress", meta: "" },
            { label: "Resolved", meta: "" },
          ]}
          activeIndex={activeIndex}
        />
      </div>

      <div className="md:hidden mt-3 flex flex-wrap gap-2">
        <ActionPill icon={ArrowUpRight} label="Escalate" tone="danger" onClick={() => alert("Escalate (next)")} />
        <ActionPill icon={Mail} label="Email user" onClick={() => alert("Email user (next)")} />
        <ActionPill icon={CheckCircle2} label="Resolve" tone="primary" onClick={() => alert("Resolve (next)")} />
        <ActionPill icon={MoreHorizontal} label="More" onClick={() => alert("More actions (next)")} />
      </div>
    </div>
  );

  const subTabs = <DetailTabs tabs={tabs} />;

  const rightRail = (
    <div className="grid gap-4">
      <RailCard title="Service Level Agreement" accent>
        <div className="grid gap-2">
          <div className="rounded-xl border hi5-border p-3 bg-[rgba(var(--hi5-accent),0.10)]">
            <div className="text-xs opacity-70">Incident SLA</div>
            <div className="text-sm font-semibold mt-0.5">{incident?.priority ?? "—"}</div>
            <div className="text-xs opacity-70 mt-1">Response target: {fmtDate(incident?.response_due_at)}</div>
            <div className="text-xs opacity-70">Resolution target: {fmtDate(incident?.resolution_due_at)}</div>
          </div>
        </div>
      </RailCard>

      <RailCard title="Ticket information">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="opacity-70">Date reported</span>
            <span className="font-medium">{fmtDate(incident?.created_at)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="opacity-70">Last updated</span>
            <span className="font-medium">{fmtDate(incident?.updated_at)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="opacity-70">Assigned to</span>
            <span className="font-medium">{incident?.assignee_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="opacity-70">Status</span>
            <span className="font-medium">{incident?.status ?? "—"}</span>
          </div>
        </div>
      </RailCard>

      <RailCard title="End-user details">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="opacity-70">User</span>
            <span className="font-medium">{incident?.requester_name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="opacity-70">Email</span>
            <span className="font-medium truncate">{incident?.requester_email ?? "—"}</span>
          </div>
        </div>
      </RailCard>
    </div>
  );

  const mainPanel =
    tab === "progress" ? (
      <div className="rounded-2xl border hi5-border bg-[rgba(var(--hi5-card),0.20)] backdrop-blur-xl p-4 sm:p-5">
        {children}
      </div>
    ) : tab === "assets" ? (
      <div className="rounded-2xl border hi5-border bg-[rgba(var(--hi5-card),0.20)] backdrop-blur-xl p-4 sm:p-5">
        <div className="text-lg font-semibold">Related Assets</div>
        <div className="text-sm opacity-70 mt-1">Next: we’ll pull tenant-scoped assets and link them here.</div>
        <div className="mt-4 rounded-2xl border hi5-border p-4 opacity-80">No assets linked yet.</div>
      </div>
    ) : tab === "ai" ? (
      <div className="rounded-2xl border hi5-border bg-[rgba(var(--hi5-card),0.20)] backdrop-blur-xl p-4 sm:p-5">
        <div className="text-lg font-semibold">AI Insights</div>
        <div className="text-sm opacity-70 mt-1">
          Next: summary, suggested next steps, similar incidents, and KB article recommendations.
        </div>
        <div className="mt-4 rounded-2xl border hi5-border p-4 opacity-80">AI insights coming next.</div>
      </div>
    ) : tab === "fields" ? (
      <div className="rounded-2xl border hi5-border bg-[rgba(var(--hi5-card),0.20)] backdrop-blur-xl p-4 sm:p-5">
        <div className="text-lg font-semibold">Additional Fields</div>
        <div className="text-sm opacity-70 mt-1">Next: dynamic custom fields per tenant + per ticket type.</div>
        <div className="mt-4 rounded-2xl border hi5-border p-4 opacity-80">No custom fields configured yet.</div>
      </div>
    ) : (
      <div className="rounded-2xl border hi5-border bg-[rgba(var(--hi5-card),0.20)] backdrop-blur-xl p-4 sm:p-5">
        <div className="text-lg font-semibold">View Log</div>
        <div className="text-sm opacity-70 mt-1">
          Next: audit log entries (status changes, assignments, comments, attachments, SLA events).
        </div>
        <div className="mt-4 rounded-2xl border hi5-border p-4 opacity-80">Log feed coming next.</div>
      </div>
    );

  return (
    <DetailShell
      header={header}
      subTabs={subTabs}
      main={<div className="grid gap-4">{mainPanel}</div>}
      rightRail={rightRail}
    />
  );
}
