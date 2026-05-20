// apps/app/src/components/shell/mobile-module-nav.tsx
import Link from "next/link";
import type { TenantShellModule } from "@/components/shell/tenant-sidebar";

export default function MobileModuleNav({
  modules,
  activeModule,
}: {
  modules: TenantShellModule[];
  activeModule?: string;
}) {
  if (!modules.length) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t hi5-border bg-[rgb(var(--hi5-topbar)/0.88)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
        {modules.slice(0, 4).map((module) => {
          const active = module.key === activeModule;

          return (
            <Link
              key={module.key}
              href={module.href}
              className={[
                "rounded-2xl px-2 py-2 text-center text-[11px] font-black",
                active
                  ? "bg-[rgb(var(--hi5-accent)/0.14)] hi5-accent"
                  : "opacity-65",
              ].join(" ")}
            >
              {module.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
