// apps/app/src/components/shell/tenant-sidebar.tsx
import Link from "next/link";
import type { TenantShellTenant } from "@/components/shell/tenant-shell";

export type TenantShellModule = {
  key: string;
  title: string;
  description?: string;
  href: string;
  badge?: string | null;
};

export type TenantShellNavItem = {
  key: string;
  title: string;
  href: string;
  description?: string | null;
  badge?: string | null;
};

function environmentLabel(value?: string | null) {
  if (value === "test") return "Test environment";
  if (value === "staging") return "Staging environment";
  return "Production";
}

export default function TenantSidebar({
  tenant,
  modules,
  activeModule,
  navigationTitle,
  navigation = [],
}: {
  tenant: TenantShellTenant;
  modules: TenantShellModule[];
  activeModule?: string;
  navigationTitle?: string;
  navigation?: TenantShellNavItem[];
}) {
  const tenantName = tenant.name || tenant.subdomain || "Workspace";

  return (
    <div className="sticky top-[96px] space-y-4">
      <section className="hi5-panel p-5">
        <div className="text-xs font-black uppercase tracking-[0.18em] opacity-55">
          Workspace
        </div>

        <h2 className="mt-2 truncate text-xl font-black tracking-tight">
          {tenantName}
        </h2>

        <div className="mt-3 rounded-2xl border hi5-border bg-black/5 p-3 text-sm dark:bg-white/5">
          <div className="text-xs opacity-60">Environment</div>
          <div className="mt-1 font-black">{environmentLabel(tenant.environmentKey)}</div>
        </div>

        {tenant.planLabel ? (
          <div className="mt-2 rounded-2xl border hi5-border bg-black/5 p-3 text-sm dark:bg-white/5">
            <div className="text-xs opacity-60">Plan</div>
            <div className="mt-1 font-black">{tenant.planLabel}</div>
          </div>
        ) : null}
      </section>

      <nav className="hi5-panel p-3">
        <div className="px-2 pb-2 text-xs font-black uppercase tracking-[0.18em] opacity-55">
          Apps
        </div>

        <div className="grid gap-1">
          {modules.map((module) => {
            const active = module.key === activeModule;

            return (
              <Link
                key={module.key}
                href={module.href}
                className={[
                  "rounded-2xl border px-3 py-3 text-sm transition",
                  active
                    ? "border-[rgb(var(--hi5-accent)/0.4)] bg-[rgb(var(--hi5-accent)/0.12)] hi5-accent"
                    : "border-transparent hover:border-[rgb(var(--hi5-border)/var(--hi5-border-alpha))] hover:bg-black/5 dark:hover:bg-white/5",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black">{module.title}</span>

                  {module.badge ? (
                    <span className="rounded-full border hi5-border bg-black/5 px-2 py-0.5 text-[10px] font-black dark:bg-white/5">
                      {module.badge}
                    </span>
                  ) : null}
                </div>

                {module.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-65">
                    {module.description}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {navigation.length ? (
        <nav className="hi5-panel p-3">
          <div className="px-2 pb-2 text-xs font-black uppercase tracking-[0.18em] opacity-55">
            {navigationTitle || "Navigation"}
          </div>

          <div className="grid gap-1">
            {navigation.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-2xl border border-transparent px-3 py-3 text-sm transition hover:border-[rgb(var(--hi5-border)/var(--hi5-border-alpha))] hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black">{item.title}</span>

                  {item.badge ? (
                    <span className="rounded-full border hi5-border bg-black/5 px-2 py-0.5 text-[10px] font-black dark:bg-white/5">
                      {item.badge}
                    </span>
                  ) : null}
                </div>

                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-65">
                    {item.description}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
