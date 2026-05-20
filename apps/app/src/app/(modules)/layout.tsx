// apps/app/src/app/(modules)/layout.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getTenantEnvironmentHost,
  resolveTenantEnvironment,
} from "@/lib/tenant/environment-host";
import StagingChangesBanner from "@/components/environments/staging-changes-banner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hostInfo = await getTenantEnvironmentHost();

  if (hostInfo.isPlatformAdminHost) {
    redirect("/admin-console");
  }

  if (hostInfo.isAppHost) {
    redirect("/workspaces");
  }

  if (!hostInfo.isTenantHost) {
    redirect("/workspaces");
  }

  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/login");
  }

  const resolved = await resolveTenantEnvironment();

  if (!resolved?.tenantId || !resolved.tenant?.id) {
    const requested =
      hostInfo.requestedSubdomain ||
      hostInfo.tenantSubdomain ||
      hostInfo.hostSubdomain ||
      hostInfo.host;

    redirect(`/tenant-available?requested=${encodeURIComponent(requested)}`);
  }

  const tenantId = resolved.tenantId;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, created_at")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const activeMembership = memberships?.[0] ?? null;

  if (!activeMembership?.id) {
    redirect(`/login?error=tenant_access`);
  }

  const { data: mods } = await supabase
    .from("module_assignments")
    .select("module")
    .eq("membership_id", activeMembership.id);

  const allowedModules = Array.from(
    new Set((mods ?? []).map((m) => m.module))
  ) as ModuleKey[];

  void allowedModules;

  return (
    <div
      className="hi5-bg min-h-dvh"
      data-tenant-id={tenantId}
      data-tenant-subdomain={resolved.tenantSubdomain || ""}
      data-requested-subdomain={resolved.requestedSubdomain || ""}
      data-environment={resolved.environmentKey}
      data-role={activeMembership.role || ""}
    >
      {resolved.environmentKey === "staging" ? <StagingChangesBanner /> : null}

      <main className="w-full">{children}</main>
    </div>
  );
}
