import Link from "next/link";
import type { ReactNode } from "react";
import type { PlatformAdminContext } from "@/lib/platform-admin/guard";

const nav = [
  { label: "Dashboard", href: "/admin-console" },
  { label: "Tenants", href: "/admin-console/tenants" },
  { label: "Billing", href: "/admin-console/billing" },
  { label: "Releases", href: "/admin-console/releases" },
  { label: "Audit", href: "/admin-console/audit" },
  { label: "Settings", href: "/admin-console/settings" },
];

export default function PlatformAdminShell({
  admin,
  children,
}: {
  admin: PlatformAdminContext;
  children: ReactNode;
}) {
  return (
    <div className="hi5-page">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="hi5-panel p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] opacity-60">
                Hi5Tech Platform Admin
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">
                Admin Console
              </h1>
              <p className="mt-1 text-sm opacity-70">
                Signed in as {admin.email} · Role: {admin.role}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {admin.isTestingMode ? (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-200">
                  Testing mode: any signed-in user allowed
                </span>
              ) : null}

              <form action="/auth/signout" method="post">
                <button type="submit" className="hi5-btn-ghost text-sm">
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-2xl border hi5-border bg-black/5 px-3 py-2 text-sm font-bold transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <main className="mt-5">{children}</main>
      </div>
    </div>
  );
}
