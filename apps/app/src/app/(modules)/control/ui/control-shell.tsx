"use client";

import type { ReactNode } from "react";
import { Monitor, TerminalSquare, FolderOpen, Settings, LayoutDashboard } from "lucide-react";
import { AppShell, type ShellNavItem } from "@/components/shell";
import AccountDropdown from "@/components/ui/account-dropdown";
import { Bell, Search } from "lucide-react";

type Props = {
  children: ReactNode;
  user?: { name?: string | null; email?: string | null; role?: string | null } | null;
  tenantLabel?: string | null;
};

const NAV: ShellNavItem[] = [
  { href: "/control", label: "Dashboard", icon: <LayoutDashboard size={16} />, exact: true },
  { href: "/control/devices", label: "Devices", icon: <Monitor size={16} /> },
  { href: "/control/terminal", label: "Terminal", icon: <TerminalSquare size={16} /> },
  { href: "/control/files", label: "Files", icon: <FolderOpen size={16} /> },
  { href: "/control/settings", label: "Settings", icon: <Settings size={16} /> },
];

export default function ControlShell({ children, user, tenantLabel }: Props) {
  return (
    <AppShell
      title="Hi5Tech Control"
      homeHref="/control"
      navItems={NAV}
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
            tenantLabel={tenantLabel}
          />
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
