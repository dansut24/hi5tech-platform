"use client";

import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Monitor,
  TerminalSquare,
  FolderOpen,
  Settings,
  Activity,
  Bell,
  Search,
  PlusCircle,
  PackageSearch,
} from "lucide-react";
import { AppShell, type ShellNavItem } from "@/components/shell";
import AccountDropdown from "@/components/ui/account-dropdown";

type Props = {
  children: ReactNode;
  user?: { name?: string | null; email?: string | null; role?: string | null } | null;
  tenantLabel?: string | null;

  // Passed by the current control layout in newer platform builds.
  // The shell does not need to inspect it yet, but accepting it keeps
  // the layout contract compatible with feature-gated navigation later.
  features?: unknown;
};

const NAV: ShellNavItem[] = [
  { href: "/control", label: "Dashboard", icon: <LayoutDashboard size={16} />, exact: true },
  { href: "/control/devices", label: "Devices", icon: <Monitor size={16} /> },
  { href: "/control/add-device", label: "Add Device", icon: <PlusCircle size={16} /> },
  { href: "/control/downloads", label: "Downloads", icon: <FolderOpen size={16} /> },
  { href: "/control/performance", label: "Performance", icon: <Activity size={16} /> },
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
