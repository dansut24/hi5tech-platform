"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
} from "lucide-react";

export default function IncidentDetailFrame({
  number,
  title,
  status,
  priority,
  children,
}: {
  number?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
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
        subtitle={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
              {String(status ?? "—").replaceAll("_", " ")}
            </span>
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs hi5-border opacity-80">
              {priority ?? "—"}
            </span>
          </div>
        }
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
            <ActionPill>
              <ArrowUpRight className="h-4 w-4" />
              Open
            </ActionPill>
          }
        />

        <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">{children}</div>

          <div className="space-y-3">
            <StatusStepper value={status} />

            <RailCard title="Actions">
              <div className="flex flex-col gap-2">
                <ActionPill>
                  <MessageSquare className="h-4 w-4" />
                  Add update
                </ActionPill>
                <ActionPill>
                  <FileText className="h-4 w-4" />
                  Attach file
                </ActionPill>
              </div>
            </RailCard>
          </div>
        </div>
      </DetailShell>
    </div>
  );
}
