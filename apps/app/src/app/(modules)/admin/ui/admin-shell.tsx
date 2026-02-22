"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  Receipt,
  ScrollText,
  Bell,
  Search,
} from "lucide-react";

import { AppShell, type ShellNavItem } from "@/components/shell";
import AccountDropdown from "@/components/ui/account-dropdown";

export default function AdminShell({
  children,
  user,
  tenant,
}: {
  children: ReactNode;
  user: { id: string; name: string; email: string; role: string };
  tenant: { id: string; name: string; domain: string; subdomain: string };
}) {
  const nav: ShellNavItem[] = useMemo(
    () => [
      { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={16} />, exact: true },
      { href: "/admin/users", label: "Users", icon: <Users size={16} /> },
      { href: "/admin/tenant", label: "Tenant", icon: <Settings size={16} /> },
      { href: "/admin/billing", label: "Billing", icon: <Receipt size={16} /> },
      { href: "/admin/audit", label: "Audit log", icon: <ScrollText size={16} /> },
    ],
    []
  );

  const tenantHost = `${tenant.subdomain}.${tenant.domain}`;

  return (
    <AppShell
      title="Hi5Tech Admin"
      homeHref="/admin"
      navItems={nav}
      sidebarDefaultCollapsed={false}
      headerLeftSlot={
        <div className="hidden sm:block text-xs opacity-70 truncate max-w-[360px]">
          {tenantHost}
        </div>
      }
      headerRightSlot={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition"
            aria-label="Search"
            title="Search"
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border hi5-border hover:bg-black/5 dark:hover:bg-white/5 transition"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
          </button>
          <AccountDropdown
            name={user?.name}
            email={user?.email}
            role={user?.role}
            tenantLabel={tenantHost}
          />
        </div>
      }
      showBreadcrumbs={true}
    >
      <div className="max-w-6xl mx-auto">{children}</div>
    </AppShell>
  );
}
