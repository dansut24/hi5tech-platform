// apps/app/src/app/apps/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  getTenantEnvironmentHost,
  resolveTenantEnvironment,
} from "@/lib/tenant/environment-host";
import { getTenantBillingProfile } from "@/lib/billing/tenant-billing";
import TrialBanner from "@/components/billing/trial-banner";
import TenantShell from "@/components/shell/tenant-shell";
import type { TenantShellModule } from "@/components/shell/tenant-sidebar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

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

const MODULE_CATALOG: Record<
  ModuleKey,
  {
    key: ModuleKey;
    title: string;
    shortTitle: string;
    description: string;
    href: string;
    badge?: string;
    gradient: string;
    features: string[];
  }
> = {
  itsm: {
    key: "itsm",
    title: "ITSM",
    shortTitle: "ITSM",
    description: "Incidents, service requests, changes, assets and knowledge.",
    href: "/itsm",
    badge: "Core",
    gradient:
      "radial-gradient(700px 240px at 10% 0%, rgb(var(--hi5-accent) / 0.24), transparent 62%), radial-gradient(700px 260px at 90% 100%, rgb(var(--hi5-accent-2) / 0.18), transparent 62%)",
    features: ["Incidents", "Requests", "Changes", "Knowledge"],
  },
  control: {
    key: "control",
    title: "Control",
    shortTitle: "Control",
    description: "Devices, inventory, remote tools, scripts and patching.",
    href: "/control/devices",
    badge: "RMM",
    gradient:
      "radial-gradient(700px 240px at 10% 0%, rgb(var(--hi5-accent-3) / 0.20), transparent 62%), radial-gradient(700px 260px at 90% 100%, rgb(var(--hi5-accent) / 0.18), transparent 62%)",
    features: ["Devices", "Inventory", "Remote tools", "Scripts"],
  },
  selfservice: {
    key: "selfservice",
    title: "Self Service",
    shortTitle: "Portal",
    description: "End-user portal for tickets, updates and knowledge articles.",
    href: "/selfservice",
    badge: "Portal",
    gradient:
      "radial-gradient(700px 240px at 10% 0%, rgb(var(--hi5-accent-2) / 0.18), transparent 62%), radial-gradient(700px 260px at 90% 100%, rgb(var(--hi5-accent-3) / 0.16), transparent 62%)",
    features: ["My tickets", "Requests", "Approvals", "Knowledge"],
  },
  admin: {
    key: "admin",
    title: "Admin",
    shortTitle: "Admin",
    description: "Users, teams, branding, billing, modules and security.",
    href: "/admin",
    badge: "Settings",
    gradient:
      "radial-gradient(700px 240px at 10% 0%, rgb(var(--hi5-accent) / 0.18), transparent 62%), radial-gradient(700px 260px at 90% 100%, rgb(var(--hi5-accent-2) / 0.14), transparent 62%)",
    features: ["Users", "Teams", "Billing", "Modules"],
  },
};

function formatEnvironment(value: string) {
  if (value === "test") return "Test";
  if (value === "staging") return "Staging";
  return "Production";
}

function initials(name?: string | null, fallback?: string | null) {
  const clean = String(name || "").trim();

  if (clean) {
    return clean
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  const f = String(fallback || "").trim();
  return f ? f[0].toUpperCase() : "H";
}

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

function ModuleCard({
  module,
  role,
}: {
  module: (typeof MODULE_CATALOG)[ModuleKey];
  role: string;
}) {
  return (
    <article className="hi5-card min-h-[310px] overflow-hidden p-0">
      <div className="pointer-events-none absolute inset-0 opacity-95" style={{ background: module.gradient }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 to-transparent opacity-70 dark:from-white/10" />

      <div className="relative z-10 flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-3xl border hi5-border bg-white/50 text-lg font-black backdrop-blur dark:bg-black/25">
            {initials(module.title)}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {module.badge ? (
              <span className="rounded-full border hi5-border bg-white/45 px-2.5 py-1 text-xs font-black dark:bg-black/25">
                {module.badge}
              </span>
            ) : null}

            {module.key === "itsm" ? (
              <span className="rounded-full border hi5-border bg-white/45 px-2.5 py-1 text-xs font-black dark:bg-black/25">
                {role}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <h2 className="text-2xl font-black tracking-tight">{module.title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-75">{module.description}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {module.features.map((feature) => (
            <span
              key={feature}
              className="rounded-full border hi5-border bg-white/35 px-3 py-1 text-xs font-bold opacity-90 dark:bg-black/20"
            >
              {feature}
            </span>
          ))}
        </div>

        <div className="flex-1" />

        <div className="mt-6 grid gap-2">
          {module.key === "itsm" ? (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/itsm/incidents" className="hi5-btn-ghost text-center text-xs">
                Incidents
              </Link>

              <Link href="/itsm/incidents/new" className="hi5-btn-ghost text-center text-xs">
                New ticket
              </Link>
            </div>
          ) : null}

          {module.key === "control" ? (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/control/devices" className="hi5-btn-ghost text-center text-xs">
                Devices
              </Link>

              <Link href="/control/devices" className="hi5-btn-ghost text-center text-xs">
                Remote tools
              </Link>
            </div>
          ) : null}

          {module.key === "admin" ? (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/users" className="hi5-btn-ghost text-center text-xs">
                Users
              </Link>

              <Link href="/admin/billing" className="hi5-btn-ghost text-center text-xs">
                Billing
              </Link>
            </div>
          ) : null}

          <Link href={module.href} className="hi5-btn-primary text-center text-sm">
            Open {module.shortTitle}
          </Link>
        </div>
      </div>
    </article>
  );
}

function UpgradeHint({
  hasItsm,
  hasControl,
  canViewBilling,
}: {
  hasItsm: boolean;
  hasControl: boolean;
  canViewBilling: boolean;
}) {
  if (hasItsm && hasControl) return null;

  return (
    <section className="hi5-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight">Want to add more modules?</h2>
          <p className="mt-1 text-sm leading-6 opacity-75">
            Production only shows modules that are live on your plan. Test and staging can preview
            selected features before promotion.
          </p>
        </div>

        {canViewBilling ? (
          <Link href="/admin/billing" className="hi5-btn-primary w-auto text-sm">
            View billing
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!hasItsm ? (
          <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-xs font-bold dark:bg-white/5">
            ITSM available as upgrade
          </span>
        ) : null}

        {!hasControl ? (
          <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-xs font-bold dark:bg-white/5">
            Control available as upgrade
          </span>
        ) : null}
      </div>
    </section>
  );
}

export default async function AppsPage() {
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
  const tenantName = tenant.company_name || tenant.name || tenant.subdomain || "Workspace";

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
  const canViewBilling = role === "owner" || role === "billing_admin";

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

  const planLabel = billingResult?.plan?.label ?? "Trial";
  const billing = billingResult?.billing ?? null;

  return (
    <TenantShell
      tenant={{
        id: tenant.id,
        name: tenantName,
        subdomain: tenant.subdomain,
        environmentKey: resolved.environmentKey,
        planLabel,
      }}
      user={{
        name: profile?.full_name || user.email,
        email: profile?.email || user.email,
        avatarUrl: profile?.avatar_url,
        role,
      }}
      modules={shellModules}
      activeModule="apps"
    >
      <div className="space-y-5 pb-24 lg:pb-0">
        <section className="hi5-panel overflow-hidden p-5 sm:p-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(980px 360px at 10% 0%, rgb(var(--hi5-accent) / 0.18), transparent 62%)," +
                "radial-gradient(980px 360px at 88% 100%, rgb(var(--hi5-accent-2) / 0.15), transparent 62%)",
            }}
          />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] hi5-accent">
                {formatEnvironment(resolved.environmentKey)} workspace
              </div>

              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                Choose your app.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 opacity-75 sm:text-base">
                Access the tools available to <b>{tenantName}</b>. Production shows live modules;
                test and staging can preview selected changes before promotion.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
              <div className="rounded-2xl border hi5-border bg-white/40 p-3 dark:bg-black/20">
                <div className="text-xs opacity-60">Environment</div>
                <div className="mt-1 text-sm font-black">{formatEnvironment(resolved.environmentKey)}</div>
              </div>

              <div className="rounded-2xl border hi5-border bg-white/40 p-3 dark:bg-black/20">
                <div className="text-xs opacity-60">Plan</div>
                <div className="mt-1 text-sm font-black">{planLabel}</div>
              </div>

              <div className="rounded-2xl border hi5-border bg-white/40 p-3 dark:bg-black/20">
                <div className="text-xs opacity-60">Role</div>
                <div className="mt-1 text-sm font-black capitalize">{role}</div>
              </div>

              <div className="rounded-2xl border hi5-border bg-white/40 p-3 dark:bg-black/20">
                <div className="text-xs opacity-60">Apps</div>
                <div className="mt-1 text-sm font-black">{visibleModules.length}</div>
              </div>
            </div>
          </div>
        </section>

        {canViewBilling && billing && resolved.environmentKey === "production" ? (
          <TrialBanner
            planLabel={billingResult.plan.label}
            planKey={billingResult.plan.key}
            daysRemaining={billingResult.daysRemaining}
            trialEndsAt={billing.trial_ends_at}
            baseMonthly={Number(billing.base_monthly_amount)}
            perTechnician={Number(billing.per_technician_amount)}
            perDevice={Number(billing.per_device_amount)}
          />
        ) : null}

        {visibleModules.length ? (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleModules.map((module) => (
              <ModuleCard key={module.key} module={module} role={role} />
            ))}
          </section>
        ) : (
          <section className="hi5-panel p-6">
            <h2 className="text-2xl font-black tracking-tight">No apps available</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-75">
              Your account is active, but no application modules are currently enabled for this
              workspace, environment or your role.
            </p>

            {canViewBilling && resolved.environmentKey === "production" ? (
              <div className="mt-5">
                <Link href="/admin/billing" className="hi5-btn-primary w-auto text-sm">
                  View billing and upgrades
                </Link>
              </div>
            ) : null}
          </section>
        )}

        {resolved.environmentKey === "production" ? (
          <UpgradeHint hasItsm={hasItsm} hasControl={hasControl} canViewBilling={canViewBilling} />
        ) : null}
      </div>
    </TenantShell>
  );
}
