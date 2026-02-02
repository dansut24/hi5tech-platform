// apps/app/src/app/admin/ui/admin-shell.tsx
"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Settings,
  Receipt,
  ScrollText,
  Menu,
  X,
  LogOut,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function initials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  if (!parts.length) return "U";
  const a = (parts[0]?.[0] || "U").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b) || a;
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

  const nav: NavItem[] = useMemo(
    () => [
      { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
      { href: "/admin/users", label: "Users", icon: <Users size={18} /> },
      { href: "/admin/tenant", label: "Tenant", icon: <Settings size={18} /> },
      { href: "/admin/billing", label: "Billing", icon: <Receipt size={18} /> },
      { href: "/admin/audit", label: "Audit log", icon: <ScrollText size={18} /> },
    ],
    []
  );

  const tenantHost = `${tenant.subdomain}.${tenant.domain}`;

  return (
    <div className="min-h-dvh">
      {/* Mobile topbar */}
      <div className="sticky top-0 z-30 sm:hidden">
        <div className="hi5-topbar">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border hi5-border p-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">Admin</div>
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

              <nav className="p-2">
                {nav.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                        active
                          ? "bg-[rgba(var(--hi5-accent),0.14)] border border-[rgba(var(--hi5-accent),0.28)]"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      <span className={cn(active ? "text-[rgb(var(--hi5-accent))]" : "opacity-90")}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}

                <div className="mt-2 p-2">
                  <Link
                    href="/api/auth/logout"
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <LogOut size={18} />
                    Logout
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}

      <div className="sm:flex">
        {/* Desktop sidebar */}
        <aside className="hidden sm:block w-72 shrink-0 p-4">
          <div className="hi5-panel p-3 sticky top-4">
            <div className="px-2 py-2">
              <div className="text-sm font-semibold truncate">Admin</div>
              <div className="text-xs opacity-70 truncate">{tenantHost}</div>
            </div>

            <nav className="mt-2 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-[rgba(var(--hi5-accent),0.14)] border border-[rgba(var(--hi5-accent),0.28)]"
                        : "hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <span className={cn(active ? "text-[rgb(var(--hi5-accent))]" : "opacity-90")}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t hi5-divider pt-3 px-2">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-2xl border hi5-border grid place-items-center font-semibold text-xs"
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
                <Link
                  href="/api/auth/logout"
                  className="w-full inline-flex items-center justify-center gap-2 hi5-btn-ghost"
                >
                  <LogOut size={16} />
                  Logout
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
