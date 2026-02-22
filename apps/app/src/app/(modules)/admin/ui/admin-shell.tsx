“use client”;

import { useMemo, useState } from “react”;
import { usePathname } from “next/navigation”;
import Link from “next/link”;
import {
LayoutDashboard,
Users,
Settings,
Receipt,
ScrollText,
Menu,
X,
LogOut,
ChevronLeft,
ChevronRight,
} from “lucide-react”;

type NavItem = {
href: string;
label: string;
icon: React.ReactNode;
};

function cn(…s: Array<string | false | null | undefined>) {
return s.filter(Boolean).join(” “);
}

function initials(name: string) {
const parts = String(name || “”)
.trim()
.split(/\s+/)
.slice(0, 2);
if (!parts.length) return “U”;
const a = (parts[0]?.[0] || “U”).toUpperCase();
const b = (parts[1]?.[0] || “”).toUpperCase();
return (a + b) || a;
}

// Simple breadcrumb from pathname
function useBreadcrumbs() {
const pathname = usePathname();
const segments = pathname.split(”/”).filter(Boolean);
const crumbs: { label: string; href: string }[] = [];

let current = “”;
for (const seg of segments) {
current += `/${seg}`;
const label = seg
.replace(/-/g, “ “)
.replace(/\b\w/g, (c) => c.toUpperCase());
crumbs.push({ label, href: current });
}
return crumbs;
}

export default function AdminShell({
children,
user,
tenant,
}: {
children: React.ReactNode;
user: { id: string; name: string; email: string; role: string };
tenant: { id: string; name: string; domain: string; subdomain: string };
}) {
const pathname = usePathname();
const [mobileOpen, setMobileOpen] = useState(false);
const [collapsed, setCollapsed] = useState(false);
const breadcrumbs = useBreadcrumbs();

const nav: NavItem[] = useMemo(
() => [
{ href: “/admin”, label: “Dashboard”, icon: <LayoutDashboard size={18} /> },
{ href: “/admin/users”, label: “Users”, icon: <Users size={18} /> },
{ href: “/admin/tenant”, label: “Tenant”, icon: <Settings size={18} /> },
{ href: “/admin/billing”, label: “Billing”, icon: <Receipt size={18} /> },
{ href: “/admin/audit”, label: “Audit log”, icon: <ScrollText size={18} /> },
],
[]
);

const tenantHost = `${tenant.subdomain}.${tenant.domain}`;

const NavContent = ({ onClickItem }: { onClickItem?: () => void }) => (
<nav className="p-2 space-y-1">
{nav.map((item) => {
const active = pathname === item.href || pathname.startsWith(item.href + “/”);
return (
<Link
key={item.href}
href={item.href}
onClick={onClickItem}
title={collapsed ? item.label : undefined}
className={cn(
“flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition”,
collapsed ? “justify-center px-0” : “”,
active
? “bg-[rgba(var(–hi5-accent),0.14)] border border-[rgba(var(–hi5-accent),0.28)]”
: “hover:bg-black/5 dark:hover:bg-white/5”
)}
>
<span className={cn(active ? “text-[rgb(var(–hi5-accent))]” : “opacity-90”)}>
{item.icon}
</span>
{!collapsed && <span className="truncate">{item.label}</span>}
</Link>
);
})}
</nav>
);

return (
<div className="min-h-dvh">
{/* Mobile topbar */}
<div className="sticky top-0 z-30 sm:hidden">
<div className="px-3 pt-3">
<div className="hi5-panel">
<div className="h-14 px-3 flex items-center justify-between gap-3">
<button
type=“button”
onClick={() => setMobileOpen(true)}
className=“rounded-xl border hi5-border p-2 hover:bg-black/5 dark:hover:bg-white/5 transition”
aria-label=“Open menu”
>
<Menu size={18} />
</button>

```
          {/* Mobile breadcrumb */}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">
              {breadcrumbs.at(-1)?.label ?? "Admin"}
            </div>
            <div className="text-xs opacity-70 truncate">{tenantHost}</div>
          </div>

          <div
            className="h-9 w-9 rounded-xl border hi5-border grid place-items-center font-semibold text-xs"
            title={user.name}
          >
            {initials(user.name)}
          </div>
        </div>
      </div>
    </div>
    <div className="h-3" />
  </div>

  {/* Mobile drawer */}
  {mobileOpen && (
    <>
      <div className="hi5-overlay z-40" onClick={() => setMobileOpen(false)} />
      <div className="fixed z-50 left-0 top-0 bottom-0 w-[86%] max-w-sm">
        <div className="h-full hi5-panel p-0 overflow-hidden">
          <div className="px-4 py-4 border-b hi5-divider flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{tenantHost}</div>
              <div className="text-xs opacity-70 truncate">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl border hi5-border p-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <NavContent onClickItem={() => setMobileOpen(false)} />

          <div className="p-2 border-t hi5-divider mt-2">
            <a
              href="/auth/signout"
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              <LogOut size={18} />
              Logout
            </a>
          </div>
        </div>
      </div>
    </>
  )}

  {/* Desktop layout */}
  <div className="sm:flex">
    {/* Desktop sidebar — collapsible */}
    <aside
      className={cn(
        "hidden sm:flex flex-col shrink-0 p-4 transition-all duration-200",
        collapsed ? "w-[72px]" : "w-72"
      )}
    >
      <div className="hi5-panel p-3 sticky top-4 flex flex-col h-full">
        {/* Header row with collapse toggle */}
        <div className={cn("px-2 py-2 flex items-center", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">Admin</div>
              <div className="text-xs opacity-70 truncate">{tenantHost}</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-xl border hi5-border p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <NavContent />

        {/* User footer — hidden when collapsed */}
        {!collapsed && (
          <div className="mt-auto border-t hi5-divider pt-3 px-2">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-2xl border hi5-border grid place-items-center font-semibold text-xs shrink-0"
                title={user.name}
              >
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-xs opacity-70 truncate">
                  {user.role} • {user.email}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <a
                href="/auth/signout"
                className="w-full inline-flex items-center justify-center gap-2 hi5-btn-ghost"
              >
                <LogOut size={16} />
                Logout
              </a>
            </div>
          </div>
        )}

        {/* Collapsed: just avatar + logout icon */}
        {collapsed && (
          <div className="mt-auto flex flex-col items-center gap-2 pt-3 border-t hi5-divider">
            <div
              className="h-9 w-9 rounded-xl border hi5-border grid place-items-center font-semibold text-xs"
              title={`${user.name} • ${user.role}`}
            >
              {initials(user.name)}
            </div>
            <a
              href="/auth/signout"
              className="rounded-xl border hi5-border p-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </a>
          </div>
        )}
      </div>
    </aside>

    {/* Main content */}
    <main className="flex-1 min-w-0 px-3 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
      {/* Desktop breadcrumb */}
      <div className="hidden sm:flex items-center gap-1.5 pt-5 pb-3 text-xs opacity-60">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="opacity-50" />}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium opacity-100">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:opacity-100 transition">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      <div className="max-w-6xl mx-auto">{children}</div>
    </main>
  </div>
</div>
```

);
}
