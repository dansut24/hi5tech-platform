import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin/guard";
import PlatformAdminShell from "@/components/platform-admin/platform-admin-shell";
import DomainStatusActions from "@/components/platform-admin/domain-status-actions";
import TenantStatusActions from "@/components/platform-admin/tenant-status-actions";
import TenantTrialActions from "@/components/platform-admin/tenant-trial-actions";
import { formatGBP } from "@/lib/billing/pricing";
import { buildTenantEnvironmentUrls } from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadTenantDetail(tenantId: string) {
  const admin = supabaseAdmin();

  const { data: tenant } = await admin
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) return null;

  const [
    settings,
    billing,
    entitlements,
    environments,
    featureStates,
    customDomains,
    billingChanges,
    membershipCount,
    deviceCount,
    incidentCount,
  ] = await Promise.all([
    admin.from("tenant_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),

    admin.from("tenant_billing_profiles").select("*").eq("tenant_id", tenantId).maybeSingle(),

    admin.from("tenant_entitlements").select("*").eq("tenant_id", tenantId).order("feature_key"),

    admin
      .from("tenant_environments")
      .select("id, key, name, type, can_reset, all_features_visible, is_live, sort_order")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true }),

    admin
      .from("tenant_feature_states")
      .select("id, tenant_environment_id, feature_key, status, updated_at")
      .eq("tenant_id", tenantId)
      .order("feature_key", { ascending: true }),

    admin
      .from("tenant_custom_domains")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),

    admin
      .from("tenant_billing_changes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10),

    admin.from("memberships").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),

    admin.from("devices").select("device_id", { count: "exact", head: true }).eq("tenant_id", tenantId),

    admin.from("incidents").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);

  return {
    tenant,
    settings: settings.data,
    billing: billing.data,
    entitlements: entitlements.data ?? [],
    environments: environments.data ?? [],
    featureStates: featureStates.data ?? [],
    customDomains: customDomains.data ?? [],
    billingChanges: billingChanges.data ?? [],
    counts: {
      users: membershipCount.count ?? 0,
      devices: deviceCount.count ?? 0,
      incidents: incidentCount.count ?? 0,
    },
  };
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border hi5-border bg-black/5 p-3 dark:bg-white/5">
      <div className="text-xs opacity-65">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold">
        {value === null || value === undefined || value === "" ? "—" : String(value)}
      </div>
    </div>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "warning" | "bad" | "neutral";
}) {
  const className =
    tone === "good"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
      : tone === "warning"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"
        : tone === "bad"
          ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200"
          : "hi5-border bg-black/5 dark:bg-white/5";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function DomainStatusPill({ status }: { status: string }) {
  if (status === "active" || status === "verified") {
    return <StatusPill tone="good">{status}</StatusPill>;
  }

  if (status === "pending") {
    return <StatusPill tone="warning">{status}</StatusPill>;
  }

  if (status === "failed" || status === "disabled") {
    return <StatusPill tone="bad">{status}</StatusPill>;
  }

  return <StatusPill>{status || "unknown"}</StatusPill>;
}

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const adminContext = await requirePlatformAdmin();
  const detail = await loadTenantDetail(tenantId);

  if (!detail) notFound();

  const tenant = detail.tenant;
  const settings = detail.settings;
  const billing = detail.billing;

  const tenantName = tenant.company_name || tenant.name || tenant.subdomain || tenant.id;

  const urls = buildTenantEnvironmentUrls({
    subdomain: tenant.subdomain,
    rootDomain: tenant.domain || "hi5tech.co.uk",
  });

  const workspaceUrl = urls.production;

  const featureStatesByEnvironment = new Map<string, any[]>();

  for (const state of detail.featureStates) {
    const existing = featureStatesByEnvironment.get(state.tenant_environment_id) ?? [];
    existing.push(state);
    featureStatesByEnvironment.set(state.tenant_environment_id, existing);
  }

  return (
    <PlatformAdminShell admin={adminContext}>
      <div className="space-y-5">
        <div className="hi5-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/admin-console/tenants" className="text-sm font-bold hi5-accent">
                ← Back to tenants
              </Link>

              <div className="mt-4 text-xs uppercase tracking-[0.18em] opacity-60">
                Tenant detail
              </div>

              <h2 className="mt-2 text-3xl font-black tracking-tight">
                {tenantName}
              </h2>

              <p className="mt-2 text-sm opacity-75">
                {workspaceUrl}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={workspaceUrl} className="hi5-btn-ghost w-auto text-sm" target="_blank" rel="noreferrer">
                Open production
              </a>

              <a href={urls.test} className="hi5-btn-ghost w-auto text-sm" target="_blank" rel="noreferrer">
                Open test
              </a>

              <a href={urls.staging} className="hi5-btn-ghost w-auto text-sm" target="_blank" rel="noreferrer">
                Open staging
              </a>

              <button className="hi5-btn-ghost w-auto text-sm" disabled>
                Suspend placeholder
              </button>
            </div>
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Environment URLs</div>
          <p className="mt-2 text-sm opacity-75">
            Each tenant environment is separated by hostname.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <a
              href={urls.production}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border hi5-border bg-black/5 p-4 transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="text-xs opacity-65">Production</div>
              <div className="mt-1 break-words text-sm font-bold">{urls.production}</div>
            </a>

            <a
              href={urls.test}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border hi5-border bg-black/5 p-4 transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="text-xs opacity-65">Test</div>
              <div className="mt-1 break-words text-sm font-bold">{urls.test}</div>
            </a>

            <a
              href={urls.staging}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border hi5-border bg-black/5 p-4 transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="text-xs opacity-65">Staging</div>
              <div className="mt-1 break-words text-sm font-bold">{urls.staging}</div>
            </a>
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Platform admin actions</div>
          <p className="mt-2 text-sm opacity-75">
            Manual tenant management actions. These are Hi5Tech-only controls and are written to the platform audit log.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TenantStatusActions tenantId={tenant.id} currentStatus={tenant.status} />
            <TenantTrialActions tenantId={tenant.id} />
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Custom domains</div>
          <p className="mt-2 text-sm opacity-75">
            Customer-owned domains connected to this tenant.
          </p>

          <div className="mt-4 grid gap-3">
            {detail.customDomains.length ? (
              detail.customDomains.map((domain: any) => (
                <div
                  key={domain.id}
                  className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-bold">{domain.domain}</div>

                      <div className="mt-1 text-sm opacity-70">
                        Environment: {domain.environment_key} · Method: {domain.verification_method}
                      </div>

                      <div className="mt-1 text-sm opacity-70">
                        DNS target: {domain.dns_target || "—"}
                      </div>

                      <div className="mt-1 break-words font-mono text-xs opacity-60">
                        {domain.verification_token}
                      </div>

                      <div className="mt-2 text-xs opacity-60">
                        Created {formatDate(domain.created_at)}
                        {domain.verified_at ? ` · Verified ${formatDate(domain.verified_at)}` : ""}
                        {domain.activated_at ? ` · Activated ${formatDate(domain.activated_at)}` : ""}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <DomainStatusPill status={domain.status} />
                      <DomainStatusActions domainId={domain.id} currentStatus={domain.status} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                No custom domains configured.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="hi5-card p-5">
            <div className="text-xs opacity-65">Users</div>
            <div className="mt-1 text-3xl font-black">{detail.counts.users}</div>
          </div>

          <div className="hi5-card p-5">
            <div className="text-xs opacity-65">Devices</div>
            <div className="mt-1 text-3xl font-black">{detail.counts.devices}</div>
          </div>

          <div className="hi5-card p-5">
            <div className="text-xs opacity-65">Incidents</div>
            <div className="mt-1 text-3xl font-black">{detail.counts.incidents}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="hi5-panel p-5">
            <div className="text-lg font-extrabold">Tenant overview</div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tenant ID" value={tenant.id} />
              <Field label="Company name" value={tenant.company_name || tenant.name} />
              <Field label="Domain" value={tenant.domain} />
              <Field label="Subdomain" value={tenant.subdomain} />
              <Field label="Status" value={tenant.status} />
              <Field label="Plan" value={tenant.plan || tenant.onboarding_product} />
              <Field label="Created" value={formatDate(tenant.created_at)} />
              <Field label="Trial ends" value={formatDate(tenant.trial_ends_at)} />
            </div>
          </div>

          <div className="hi5-panel p-5">
            <div className="text-lg font-extrabold">Billing</div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Billing status" value={billing?.billing_status} />
              <Field label="Plan key" value={billing?.plan_key} />
              <Field label="Billing email" value={billing?.billing_email} />
              <Field label="Currency" value={billing?.currency} />
              <Field
                label="Base monthly"
                value={billing ? formatGBP(Number(billing.base_monthly_amount || 0)) : "—"}
              />
              <Field
                label="Per technician"
                value={billing ? formatGBP(Number(billing.per_technician_amount || 0)) : "—"}
              />
              <Field
                label="Per device"
                value={billing ? formatGBP(Number(billing.per_device_amount || 0)) : "—"}
              />
              <Field label="Cancel at period end" value={billing?.cancel_at_period_end ? "Yes" : "No"} />
            </div>
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Tenant settings</div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Support email" value={settings?.support_email} />
            <Field label="Timezone" value={settings?.timezone} />
            <Field label="Default region" value={settings?.default_region} />
            <Field label="Default appearance" value={settings?.default_appearance} />
            <Field label="Accent colour" value={settings?.accent_color} />
            <Field label="Theme preset" value={settings?.theme_preset} />
            <Field label="Setup complete" value={settings?.setup_completed_at ? "Yes" : "No"} />
            <Field label="Updated" value={formatDate(settings?.updated_at)} />
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Environments</div>
          <p className="mt-2 text-sm opacity-75">
            Production is live. Test is resettable. Staging is for selected changes before promotion.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {detail.environments.map((environment: any) => {
              const states = featureStatesByEnvironment.get(environment.id) ?? [];
              const liveCount = states.filter((state: any) => state.status === "live").length;
              const availableCount = states.filter((state: any) => state.status === "available").length;
              const selectedCount = states.filter(
                (state: any) => state.status === "selected" || state.status === "staged"
              ).length;
              const disabledCount = states.filter((state: any) => state.status === "disabled").length;

              return (
                <div
                  key={environment.id}
                  className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-extrabold">{environment.name || environment.key}</div>
                      <div className="mt-1 text-sm opacity-70">{environment.type || environment.key}</div>
                    </div>

                    {environment.is_live ? (
                      <StatusPill tone="good">Live</StatusPill>
                    ) : environment.can_reset ? (
                      <StatusPill tone="warning">Resettable</StatusPill>
                    ) : (
                      <StatusPill>Non-live</StatusPill>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <Field label="Live" value={liveCount} />
                    <Field label="Available" value={availableCount} />
                    <Field label="Selected/staged" value={selectedCount} />
                    <Field label="Disabled" value={disabledCount} />
                  </div>
                </div>
              );
            })}

            {!detail.environments.length ? (
              <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                No environment rows found for this tenant.
              </div>
            ) : null}
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Features / entitlements</div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.entitlements.map((feature: any) => (
              <div
                key={feature.feature_key}
                className="rounded-2xl border hi5-border bg-black/5 p-3 dark:bg-white/5"
              >
                <div className="text-sm font-bold">{feature.feature_key}</div>
                <div
                  className={[
                    "mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
                    feature.enabled
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                      : "border-slate-500/25 bg-slate-500/10 opacity-70",
                  ].join(" ")}
                >
                  {feature.enabled ? "Enabled" : "Disabled"}
                </div>
              </div>
            ))}

            {!detail.entitlements.length ? (
              <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                No entitlements found.
              </div>
            ) : null}
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">Recent billing changes</div>

          <div className="mt-4 grid gap-3">
            {detail.billingChanges.map((change: any) => (
              <div
                key={change.id}
                className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold">{change.change_type}</div>
                    <div className="text-sm opacity-70">
                      {change.from_plan || "—"} → {change.to_plan || "—"}
                    </div>
                    <div className="mt-1 text-xs opacity-60">
                      Created {formatDate(change.created_at)}
                    </div>
                  </div>

                  <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-xs font-bold dark:bg-white/5">
                    {change.status}
                  </span>
                </div>
              </div>
            ))}

            {!detail.billingChanges.length ? (
              <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                No billing changes yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="hi5-card p-5">
          <div className="text-lg font-extrabold">Placeholders ready</div>
          <p className="mt-2 text-sm leading-6 opacity-75">
            Next passes will add editable GUI forms for tenant settings, users, billing, invoices,
            feature toggles, environment promotion and dangerous actions.
          </p>
        </div>
      </div>
    </PlatformAdminShell>
  );
}
