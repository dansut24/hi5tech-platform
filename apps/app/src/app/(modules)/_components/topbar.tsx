"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

type Props = {
  allowedModules: ModuleKey[];
  tenantLabel: string | null;
};

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-xl border hi5-border text-sm",
        "hover:bg-black/5 dark:hover:bg-white/5 transition",
        active ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.30)] hi5-accent" : "opacity-85",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function TopBar({ allowedModules, tenantLabel }: Props) {
  const pathname = usePathname();

  const has = (m: ModuleKey) => Array.isArray(allowedModules) && allowedModules.includes(m);

  // Keep these stable, even if routes change later
  const items: Array<{ key: ModuleKey; href: string; label: string }> = [
    { key: "itsm", href: "/itsm", label: "ITSM" },
    { key: "control", href: "/control", label: "Control" },
    { key: "selfservice", href: "/selfservice", label: "Self Service" },
    { key: "admin", href: "/admin", label: "Admin" },
  ];

  return (
    <div
      className="fixed left-0 right-0 z-50"
      style={{ top: 0 }}
    >
      <div className="hi5-panel border-b hi5-border">
        <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-3">
          {/* Left: brand + tenant */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/apps" className="font-semibold tracking-tight whitespace-nowrap">
              Hi5Tech
            </Link>

            <div className="h-6 w-px bg-[rgba(var(--hi5-border),var(--hi5-border-alpha))]" />

            <div className="min-w-0">
              <div className="text-xs opacity-70 leading-tight">Tenant</div>
              <div className="text-sm font-medium truncate">
                {tenantLabel ?? "—"}
              </div>
            </div>
          </div>

          {/* Center: module nav */}
          <div className="hidden md:flex items-center gap-2">
            {items
              .filter((it) => has(it.key))
              .map((it) => (
                <NavLink
                  key={it.key}
                  href={it.href}
                  label={it.label}
                  active={pathname === it.href || pathname.startsWith(it.href + "/")}
                />
              ))}
          </div>

          {/* Right: simple actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm opacity-80 hover:opacity-100 transition"
            >
              Account
            </Link>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden px-3 pb-3 flex flex-wrap gap-2">
          {items
            .filter((it) => has(it.key))
            .map((it) => (
              <NavLink
                key={it.key}
                href={it.href}
                label={it.label}
                active={pathname === it.href || pathname.startsWith(it.href + "/")}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
