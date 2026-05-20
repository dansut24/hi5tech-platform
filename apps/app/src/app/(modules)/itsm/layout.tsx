// apps/app/src/app/(modules)/itsm/layout.tsx
import { redirect } from "next/navigation";
import TenantShell from "@/components/shell/tenant-shell";
import { requireTenantShellContext } from "@/lib/shell/tenant-shell-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ITSM_NAVIGATION = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/itsm",
    description: "Live ITSM overview and workload.",
  },
  {
    key: "incidents",
    title: "Incidents",
    href: "/itsm/incidents",
    description: "Faults, issues and service interruptions.",
  },
  {
    key: "new-incident",
    title: "New ticket",
    href: "/itsm/incidents/new",
    description: "Create a new incident or request.",
  },
  {
    key: "requests",
    title: "Requests",
    href: "/itsm/requests",
    description: "Service requests and fulfilment.",
    badge: "Soon",
  },
  {
    key: "changes",
    title: "Changes",
    href: "/itsm/changes",
    description: "Change records, approvals and releases.",
    badge: "Soon",
  },
  {
    key: "problems",
    title: "Problems",
    href: "/itsm/problems",
    description: "Root cause investigations and known errors.",
    badge: "Soon",
  },
  {
    key: "assets",
    title: "Assets",
    href: "/itsm/assets",
    description: "Linked devices, users and configuration items.",
  },
  {
    key: "knowledge",
    title: "Knowledge",
    href: "/itsm/knowledge",
    description: "Articles, fixes and reusable guidance.",
    badge: "Soon",
  },
  {
    key: "settings",
    title: "Settings",
    href: "/itsm/settings",
    description: "Teams, defaults and ITSM configuration.",
  },
];

export default async function ItsmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireTenantShellContext();

  if (!context.enabledModules.has("itsm")) {
    redirect("/apps");
  }

  return (
    <TenantShell
      tenant={context.shellTenant}
      user={context.shellUser}
      modules={context.shellModules}
      activeModule="itsm"
      navigationTitle="ITSM"
      navigation={ITSM_NAVIGATION}
    >
      <div className="pb-24 lg:pb-0">{children}</div>
    </TenantShell>
  );
}
