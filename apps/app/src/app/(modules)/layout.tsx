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
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/login");
  }

  const tenantHost = await getTenantEnvironmentHost();

  if (!tenantHost.isTenantHost) {
    redirect("/apps");
  }

  const resolved = await resolveTenantEnvironment();

  if (!resolved?.tenantId || !resolved.tenant?.id) {
    const requested =
      tenantHost.requestedSubdomain ||
      tenantHost.tenantSubdomain ||
      tenantHost.hostSubdomain ||
      tenantHost.host;

    redirect(`/tenant-available?requested=${encodeURIComponent(requested)}`);
  }

  const tenantId = resolved.tenantId;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, created_at")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const activeMembershipId = memberships?.[0]?.id ?? null;

  if (!activeMembershipId) {
    redirect(`/login?error=tenant_access`);
  }

  const { data: mods } = await supabase
    .from("module_assignments")
    .select("module")
    .eq("membership_id", activeMembershipId);

  const allowedModules = Array.from(
    new Set((mods ?? []).map((m) => m.module))
  ) as ModuleKey[];

  void allowedModules;

  const tenantLabel =
    resolved.tenant.subdomain && resolved.tenant.domain
      ? `${resolved.tenant.subdomain}.${resolved.tenant.domain}`
      : resolved.tenant.domain || resolved.tenant.name || null;

  void tenantLabel;

  const environmentKey = resolved.environmentKey;
  void environmentKey;

  return (
    <div
      className="hi5-bg min-h-dvh"
      data-tenant-id={tenantId}
      data-tenant-subdomain={resolved.tenantSubdomain || ""}
      data-requested-subdomain={resolved.requestedSubdomain || ""}
      data-environment={resolved.environmentKey}
    >
      <StagingChangesBanner />

      <main className="w-full">{children}</main>
    </div>
  );
}
