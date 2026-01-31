"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
        "shrink-0 px-3 py-1.5 rounded-full border hi5-border text-xs font-medium whitespace-nowrap",
        "hover:bg-black/5 dark:hover:bg-white/5 transition",
        active
          ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.35)] hi5-accent"
          : "opacity-85",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function TopBar({ allowedModules, tenantLabel }: Props) {
  const pathname = usePathname();

  const has = (m: ModuleKey) =>
    Array.isArray(allowedModules) && allowedModules.includes(m);

  const items: Array<{ key: ModuleKey; href: string; label: string }> = [
    { key: "itsm", href: "/itsm", label: "ITSM" },
    { key: "control", href: "/control", label: "Control" },
    { key: "selfservice", href: "/selfservice", label: "Self Service" },
    { key: "admin", href: "/admin", label: "Admin" },
  ];

  return (
    <div className="sticky top-0 z-50">
      <div className="hi5-panel border-b hi5-border">
        {/* Top row */}
        <div className="h-14 px-3 flex items-center justify-between gap-3">
          {/* Left: brand + tenant */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/apps"
              className="font-semibold tracking-tight whitespace-nowrap"
            >
              Hi5Tech
            </Link>

            <div className="h-6 w-px bg-[rgba(var(--hi5-border),var(--hi5-border-alpha))]" />

            <div className="min-w-0">
              <div className="text-[10px] opacity-70 leading-tight">Tenant</div>
              <div className="text-xs font-medium truncate max-w-[140px]">
                {tenantLabel ?? "—"}
              </div>
            </div>
          </div>

          {/* Right: account */}
          <Link
            href="/login"
            className="text-sm opacity-80 hover:opacity-100 transition shrink-0"
          >
            Account
          </Link>
        </div>

        {/* Module nav */}
        <div className="px-3 pb-2">
          {/* Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {items
              .filter((it) => has(it.key))
              .map((it) => (
                <NavLink
                  key={it.key}
                  href={it.href}
                  label={it.label}
                  active={
                    pathname === it.href ||
                    pathname.startsWith(it.href + "/")
                  }
                />
              ))}
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden -mx-3 px-3 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 w-max">
              {items
                .filter((it) => has(it.key))
                .map((it) => (
                  <NavLink
                    key={it.key}
                    href={it.href}
                    label={it.label}
                    active={
                      pathname === it.href ||
                      pathname.startsWith(it.href + "/")
                    }
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
