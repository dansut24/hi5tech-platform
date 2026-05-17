// apps/app/src/app/(modules)/layout.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  getTenantEnvironmentHost,
  resolveTenantEnvironment,
} from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

export default async function ModulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();

  // Auth guard
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/login");
  }

  /*
    Environment-aware tenant host parsing.

    Correct behaviour:
    - test123.hi5tech.co.uk       -> tenant test123, environment production
    - test123-test.hi5tech.co.uk  -> tenant test123, environment test
    - test123-stg.hi5tech.co.uk   -> tenant test123, environment staging

    This replaces the old manual parsing that incorrectly looked for
    a tenant named "test123-stg".
  */
  const tenantHost = await getTenantEnvironmentHost();

  // If not a tenant host, go to apps selector / safe default
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

  // Membership check scoped to the real tenant ID, not the environment alias.
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

  /*
    Module assignments are intentionally retained for future module shell/nav gating.
    The /apps page and environment-aware module visibility are handled elsewhere.
  */
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

  /*
    Do NOT inject CSS vars here.
    Root layout is the single source of truth for theme tokens.
    This layout is only for auth + tenant/membership gating.
  */
  return (
    <div
      className="hi5-bg min-h-dvh"
      data-tenant-id={tenantId}
      data-tenant-subdomain={resolved.tenantSubdomain || ""}
      data-requested-subdomain={resolved.requestedSubdomain || ""}
      data-environment={resolved.environmentKey}
    >
      <main className="w-full">{children}</main>
    </div>
  );
}
