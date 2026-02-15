"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

function initials(email: string) {
  const base = (email || "?").split("@")[0] || "?";
  const parts = base.split(/[._-]+/g).filter(Boolean);
  const a = (parts[0]?.[0] || base[0] || "?").toUpperCase();
  const b = (parts[1]?.[0] || base[1] || "").toUpperCase();
  return (a + b).slice(0, 2);
}

function roleLabel(role: string) {
  const r = String(role || "").toLowerCase();
  if (r === "owner") return "Owner";
  if (r === "admin") return "Admin";
  if (r === "viewer") return "Viewer";
  return "User";
}

function NavSoon({ label }: { label: string }) {
  return (
    <div
      className="rounded-2xl px-3 py-2 text-sm opacity-60 cursor-not-allowed select-none"
      title="Coming soon"
      aria-disabled="true"
    >
      {label}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon?: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "rounded-2xl px-3 py-2 text-sm transition flex items-center gap-2",
        active
          ? "bg-[rgba(var(--hi5-accent),0.10)] border border-[rgba(var(--hi5-accent),0.28)]"
          : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent",
      ].join(" ")}
    >
      <span className="opacity-80">{icon || "•"}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function ControlShell({
  children,
  tenantSubdomain,
  tenantName,
  userEmail,
  userRole,
}: {
  children: React.ReactNode;
  tenantSubdomain: string;
  tenantName: string;
  userEmail: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = useMemo(
    () => [
      { href: "/control", label: "Dashboard", icon: "🏠" },
      { href: "/control/devices", label: "Devices", icon: "🖥️" },
      { href: "/control/jobs", label: "Jobs", icon: "⚡" },
      { href: "/control/activity", label: "Activity", icon: "🧾" },

      { href: "/control/alerts", label: "Alerts", icon: "🚨", soon: true },
      { href: "/control/policies", label: "Policies", icon: "🧩", soon: true },
      { href: "/control/scripts", label: "Scripts", icon: "📜", soon: true },
      { href: "/control/reports", label: "Reports", icon: "📊", soon: true },
      { href: "/control/settings", label: "Settings", icon: "⚙️", soon: true },
    ],
    []
  );

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === "/control") return pathname === "/control";
    return pathname.startsWith(href);
  }

  function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="hi5-panel w-full p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs opacity-70">Control</div>
            <div className="text-lg font-semibold leading-tight">{tenantName}</div>
            <div className="text-xs opacity-70 mt-1">{tenantSubdomain}.hi5tech.co.uk</div>
          </div>
          <div
            className="h-11 w-11 rounded-2xl"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,79,225,.85), rgba(0,193,255,.75) 55%, rgba(255,196,45,.65))",
              boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
            }}
          />
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((item) =>
            item.soon ? (
              <NavSoon key={item.href} label={`${item.icon} ${item.label} (soon)`} />
            ) : (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                onClick={onNavigate}
              />
            )
          )}
        </nav>

        <div className="mt-auto pt-2 border-t hi5-divider">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl hi5-card flex items-center justify-center font-bold">
              {initials(userEmail)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{userEmail}</div>
              <div className="text-xs opacity-70">{roleLabel(userRole)}</div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Link href="/apps" className="hi5-btn-ghost flex-1 text-center text-sm relative z-10">
              Modules
            </Link>
            <Link href="/auth/signout" className="hi5-btn-ghost flex-1 text-center text-sm relative z-10">
              Logout
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="hi5-bg">
        <div className="flex min-h-dvh">
          <aside className="hidden lg:flex w-[280px] shrink-0 p-4">
            <Sidebar />
          </aside>

          {mobileOpen ? (
            <div className="lg:hidden fixed inset-0 z-[60]">
              <div className="absolute inset-0 bg-black/55" onClick={() => setMobileOpen(false)} aria-hidden="true" />
              <div className="absolute left-0 top-0 h-full w-[min(320px,88vw)] p-4">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <header className="sticky top-0 z-30 px-4 sm:px-6 py-4">
              <div className="hi5-topbar rounded-3xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-3">
                  <button
                    type="button"
                    className="lg:hidden hi5-btn-ghost text-sm min-w-[44px] px-3"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open menu"
                  >
                    ☰
                  </button>

                  <div className="min-w-0">
                    <div className="text-xs opacity-70">Control</div>
                    <div className="text-sm font-semibold truncate">
                      {tenantName} • {tenantSubdomain}.hi5tech.co.uk
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 relative">
                  <Link href="/apps" className="hi5-btn-ghost text-sm relative z-10 min-w-[96px] text-center">
                    Modules
                  </Link>
                  <Link href="/auth/signout" className="hi5-btn-ghost text-sm relative z-10 min-w-[96px] text-center">
                    Logout
                  </Link>
                </div>
              </div>
            </header>

            <main className="px-4 sm:px-6 pb-10">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
