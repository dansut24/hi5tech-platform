// apps/app/src/components/shell/tenant-shell.tsx
import TenantTopbar from "@/components/shell/tenant-topbar";
import TenantSidebar, {
  type TenantShellModule,
  type TenantShellNavItem,
} from "@/components/shell/tenant-sidebar";
import MobileModuleNav from "@/components/shell/mobile-module-nav";

export type TenantShellUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
};

export type TenantShellTenant = {
  id: string;
  name?: string | null;
  subdomain?: string | null;
  environmentKey?: "production" | "test" | "staging";
  planLabel?: string | null;
};

export default function TenantShell({
  tenant,
  user,
  modules,
  activeModule,
  navigationTitle,
  navigation,
  children,
}: {
  tenant: TenantShellTenant;
  user: TenantShellUser;
  modules: TenantShellModule[];
  activeModule?: string;
  navigationTitle?: string;
  navigation?: TenantShellNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="hi5-page min-h-dvh">
      <TenantTopbar
        tenant={tenant}
        user={user}
        modules={modules}
        activeModule={activeModule}
        navigationTitle={navigationTitle}
        navigation={navigation}
      />

      <div className="mx-auto grid w-full max-w-[1560px] grid-cols-1 gap-5 px-4 pb-8 pt-4 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8 xl:px-10">
        <aside className="hidden lg:block">
          <TenantSidebar
            tenant={tenant}
            modules={modules}
            activeModule={activeModule}
            navigationTitle={navigationTitle}
            navigation={navigation}
          />
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      <MobileModuleNav modules={modules} activeModule={activeModule} />
    </div>
  );
}
