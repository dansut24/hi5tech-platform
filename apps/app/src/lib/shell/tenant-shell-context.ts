// apps/app/src/lib/shell/tenant-shell-context.ts
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getTenantEnvironmentHost,
  resolveTenantEnvironment,
} from "@/lib/tenant/environment-host";
import { getTenantBillingProfile } from "@/lib/billing/tenant-billing";
import type { TenantShellModule } from "@/components/shell/tenant-sidebar";
import type {
  TenantShellTenant,
  TenantShellUser,
} from "@/components/shell/tenant-shell";

export type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

const ALL_FEATURES: Record<string, boolean> = {
  itsm_core: true,
  devices_ticket_context: true,
  devices_inventory: true,
  devices_reporting: true,
  remote_control: true,
  remote_terminal: true,
  remote_files: true,
  scripts: true,
  monitoring: true,
  patch_management: true,
  automation: true,
};

export const MODULE_CATALOG: Record<
  ModuleKey,
  {
    key: ModuleKey;
    title: string;
    shortTitle: string;
    description: string;
    href: string;
    badge?: string;
  }
> = {
  itsm: {
    key: "itsm",
    title: "ITSM",
    shortTitle: "ITSM",
    description: "Incidents, service requests, changes, assets and knowledge.",
    href: "/itsm",
    badge: "Core",
  },
  control: {
    key: "control",
    title: "Control",
    shortTitle: "Control",
    description: "Devices, inventory, remote tools, scripts and patching.",
    href: "/control/devices",
    badge: "RMM",
  },
  selfservice: {
    key: "selfservice",
    title: "Self Service",
    shortTitle: "Portal",
    description: "End-user portal for tickets, updates and knowledge articles.",
    href: "/selfservice",
    badge: "Portal",
  },
  admin: {
    key: "admin",
    title: "Admin",
    shortTitle: "Admin",
    description: "Users, teams, branding, billing, modules and security.",
    href: "/admin",
    badge: "Settings",
  },
};

async function getEnvironmentFeatureMap({
  tenantId,
  environmentId,
  environmentKey,
}: {
  tenantId: string;
  environmentId?: string | null;
  environmentKey: "production" | "test" | "staging";
}) {
  if (environmentKey === "test") {
    return { ...ALL_FEATURES };
  }

  const admin = supabaseAdmin();

  if (environmentId) {
    const { data } = await admin
      .from("tenant_feature_states")
      .select("feature_key, status")
      .eq("tenant_id", tenantId)
      .eq("tenant_environment_id", environmentId);

    const map: Record<string, boolean> = {};

    for (const row of data ?? []) {
      const status = String(row.status || "");

      if (environmentKey === "production") {
        map[row.feature_key] = status === "live";
      } else {
        map[row.feature_key] =
          status === "available" ||
          status === "selected" ||
          status === "staged" ||
          status === "live";
      }
    }

    return map;
  }

  const { data } = await admin
    .from("tenant_entitlements")
    .select("feature_key, enabled")
    .eq("tenant_id", tenantId);

  const fallback: Record<string, boolean> = {};

  for (const row of data ?? []) {
    fallback[row.feature_key] = row.enabled === true;
  }

  return fallback;
}

function getEnabledModules({
  features,
  role,
}: {
  features: Record<string, boolean>;
  role: string;
}) {
  const enabled = new Set<ModuleKey>();

  const hasItsm = features.itsm_core === true;

  const hasControl =
    features.devices_inventory === true ||
    features.devices_reporting === true ||
    features.remote_control === true ||
    features.remote_terminal === true ||
    features.remote_files === true ||
    features.scripts === true ||
    features.monitoring === true ||
    features.patch_management === true ||
    features.automation === true;

  if (hasItsm) {
    enabled.add("itsm");
    enabled.add("selfservice");
  }

  if (hasControl) {
    enabled.add("control");
  }

  if (role === "owner" || role === "admin" || role === "billing_admin") {
    enabled.add("admin");
  }

  return {
    enabled,
    hasItsm,
    hasControl,
  };
}

export async function requireTenantShellContext() {
  const hostInfo = await getTenantEnvironmentHost();

  if (hostInfo.isPlatformAdminHost) {
    redirect("/admin-console");
  }

  if (hostInfo.isAppHost) {
    redirect("/workspaces");
  }

  const resolved = await resolveTenantEnvironment();

  if (!resolved?.tenantId) {
    const requested =
      hostInfo.requestedSubdomain ||
      hostInfo.tenantSubdomain ||
      hostInfo.hostSubdomain ||
      hostInfo.host;

    redirect(`/tenant-available?requested=${encodeURIComponent(requested)}`);
  }

  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/login");
  }

  const tenant = resolved.tenant;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role, created_at")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.id) {
    redirect("/login?error=tenant_access");
  }

  const role = String(membership.role || "user");

  const [{ data: profile }, features, billingResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, email")
      .eq("id", user.id)
      .maybeSingle(),
    getEnvironmentFeatureMap({
      tenantId: tenant.id,
      environmentId: resolved.environment?.id,
      environmentKey: resolved.environmentKey,
    }),
    getTenantBillingProfile(tenant.id),
  ]);

  const { enabled, hasItsm, hasControl } = getEnabledModules({
    features,
    role,
  });

  const visibleModules = (["itsm", "control", "selfservice", "admin"] as ModuleKey[])
    .filter((key) => enabled.has(key))
    .map((key) => MODULE_CATALOG[key]);

  const shellModules: TenantShellModule[] = visibleModules.map((module) => ({
    key: module.key,
    title: module.shortTitle,
    description: module.description,
    href: module.href,
    badge: module.badge,
  }));

  const tenantName =
    tenant.company_name || tenant.name || tenant.subdomain || "Workspace";

  const planLabel = billingResult?.plan?.label ?? "Trial";

  const shellTenant: TenantShellTenant = {
    id: tenant.id,
    name: tenantName,
    subdomain: tenant.subdomain,
    environmentKey: resolved.environmentKey,
    planLabel,
  };

  const shellUser: TenantShellUser = {
    name: profile?.full_name || user.email,
    email: profile?.email || user.email,
    avatarUrl: profile?.avatar_url,
    role,
  };

  return {
    hostInfo,
    resolved,
    tenant,
    tenantName,
    user,
    profile,
    membership,
    role,
    features,
    billingResult,
    enabledModules: enabled,
    visibleModules,
    shellModules,
    shellTenant,
    shellUser,
    hasItsm,
    hasControl,
    canViewBilling: role === "owner" || role === "billing_admin",
  };
}
