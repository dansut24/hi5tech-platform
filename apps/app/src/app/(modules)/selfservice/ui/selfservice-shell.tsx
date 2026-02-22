// apps/app/src/app/(modules)/selfservice/ui/selfservice-shell.tsx
import { headers } from "next/headers";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import { AppShell, type ShellNavItem } from "@/components/shell";
import { Home, AlertCircle, ClipboardList, BookOpen, User } from "lucide-react";

export const dynamic = "force-dynamic";

const NAV: ShellNavItem[] = [
  { href: "/selfservice", label: "Home", icon: <Home size={16} />, exact: true },
  { href: "/selfservice/incident/new", label: "Raise incident", icon: <AlertCircle size={16} /> },
  { href: "/selfservice/request/new", label: "Raise request", icon: <ClipboardList size={16} /> },
  { href: "/selfservice/knowledge", label: "Knowledge base", icon: <BookOpen size={16} /> },
  { href: "/selfservice/profile", label: "Profile", icon: <User size={16} /> },
];

export default async function SelfServiceShell({ children }: { children: React.ReactNode }) {
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  const tenantLabel = parsed.subdomain ? parsed.subdomain : "Hi5Tech";
  const tenantHost =
    parsed.subdomain && parsed.rootDomain
      ? `${parsed.subdomain}.${parsed.rootDomain}`
      : host;

  return (
    <AppShell
      title="Hi5Tech Self Service"
      homeHref="/selfservice"
      navItems={NAV}
      sidebarDefaultCollapsed={false}
      headerLeftSlot={
        <div className="text-xs opacity-70 hidden sm:block">
          {tenantLabel} • {tenantHost}
        </div>
      }
      // Self service usually doesn’t need breadcrumbs everywhere (personal preference).
      // If you want them on, set true.
      showBreadcrumbs={true}
      // No account dropdown wired yet here (you mentioned later via supabaseServer)
      headerRightSlot={null}
    >
      {children}
    </AppShell>
  );
}
