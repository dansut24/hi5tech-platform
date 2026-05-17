import Link from "next/link";
import { getActiveTenantId } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildTenantEnvironmentUrls } from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";

type EnvironmentKey = "production" | "test" | "staging";

const ENVIRONMENT_COPY: Record<
  EnvironmentKey,
  {
    title: string;
    description: string;
    purpose: string;
    tone: "good" | "warning" | "neutral";
  }
> = {
  production: {
    title: "Production",
    description: "Your live customer workspace.",
    purpose: "Only features promoted to live should appear here.",
    tone: "good",
  },
  test: {
    title: "Test",
    description: "A resettable sandbox for trying anything.",
    purpose: "This environment can expose every feature without affecting production.",
    tone: "warning",
  },
  staging: {
    title: "Staging",
    description: "Prepare and review changes before they go live.",
    purpose: "Selected changes will eventually be reviewed here and pushed to production.",
    tone: "neutral",
  },
};

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border hi5-border bg-black/5 p-3 dark:bg-white/5">
      <div className="text-xs opacity-65">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}

function EnvironmentCard({
  environment,
  tenant,
  url,
  states,
}: {
  environment: any;
  tenant: any;
  url: string;
  states: any[];
}) {
  const key = String(environment.key || "production") as EnvironmentKey;
  const copy = ENVIRONMENT_COPY[key] ?? ENVIRONMENT_COPY.production;

  const liveCount = states.filter((state) => state.status === "live").length;
  const availableCount = states.filter((state) => state.status === "available").length;
  const selectedCount = states.filter(
    (state) => state.status === "selected" || state.status === "staged"
  ).length;
  const disabledCount = states.filter((state) => state.status === "disabled").length;

  return (
    <div className="hi5-panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight">{copy.title}</h2>

            {environment.is_live ? (
              <StatusPill tone="good">Live</StatusPill>
            ) : environment.can_reset ? (
              <StatusPill tone="warning">Resettable</StatusPill>
            ) : (
              <StatusPill>Non-live</StatusPill>
            )}

            {environment.all_features_visible ? (
              <StatusPill tone="warning">All features visible</StatusPill>
            ) : (
              <StatusPill>Live features only</StatusPill>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 opacity-75">{copy.description}</p>
          <p className="mt-1 text-sm leading-6 opacity-65">{copy.purpose}</p>
        </div>

        <a href={url} target="_blank" rel="noreferrer" className="hi5-btn-primary w-auto text-sm">
          Open {copy.title}
        </a>
      </div>

      <div className="mt-5 rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
        <div className="text-xs opacity-65">Environment URL</div>
        <div className="mt-1 break-words text-sm font-bold">{url}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Field label="Live" value={liveCount} />
        <Field label="Available" value={availableCount} />
        <Field label="Selected/staged" value={selectedCount} />
        <Field label="Disabled" value={disabledCount} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Environment key" value={environment.key || "—"} />
        <Field label="Type" value={environment.type || "—"} />
        <Field label="Can reset" value={environment.can_reset ? "Yes" : "No"} />
        <Field label="Sort order" value={environment.sort_order ?? "—"} />
      </div>

      {states.length ? (
        <details className="mt-4 rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5">
          <summary className="cursor-pointer text-sm font-bold">
            View feature states
          </summary>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {states.map((state) => {
              const status = String(state.status || "unknown");

              return (
                <div
                  key={state.id || `${environment.id}-${state.feature_key}`}
                  className="rounded-2xl border hi5-border bg-white/45 p-3 dark:bg-black/20"
                >
                  <div className="text-sm font-bold">{state.feature_key}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill
                      tone={
                        status === "live"
                          ? "good"
                          : status === "available" || status === "selected" || status === "staged"
                            ? "warning"
                            : status === "disabled"
                              ? "bad"
                              : "neutral"
                      }
                    >
                      {status}
                    </StatusPill>
                  </div>
                  <div className="mt-2 text-xs opacity-60">
                    Updated {formatDate(state.updated_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ) : (
        <div className="mt-4 rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
          No feature states found for this environment yet.
        </div>
      )}
    </div>
  );
}

export default async function TenantAdminEnvironmentsPage() {
  const tenantId = await getActiveTenantId();
  const admin = supabaseAdmin();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, company_name, domain, subdomain, status, plan, trial_ends_at")
    .eq("id", tenantId)
    .maybeSingle();

  const { data: environments } = await admin
    .from("tenant_environments")
    .select("id, key, name, type, can_reset, all_features_visible, is_live, sort_order")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  const { data: featureStates } = await admin
    .from("tenant_feature_states")
    .select("id, tenant_environment_id, feature_key, status, updated_at")
    .eq("tenant_id", tenantId)
    .order("feature_key", { ascending: true });

  if (!tenant) {
    return (
      <div className="hi5-page">
        <div className="hi5-panel p-5">
          <h1 className="text-2xl font-black">Tenant not found</h1>
          <p className="mt-2 text-sm opacity-75">
            The active tenant could not be resolved.
          </p>
        </div>
      </div>
    );
  }

  const urls = buildTenantEnvironmentUrls({
    subdomain: tenant.subdomain,
    rootDomain: tenant.domain || "hi5tech.co.uk",
  });

  const statesByEnvironment = new Map<string, any[]>();

  for (const state of featureStates ?? []) {
    const existing = statesByEnvironment.get(state.tenant_environment_id) ?? [];
    existing.push(state);
    statesByEnvironment.set(state.tenant_environment_id, existing);
  }

  const environmentRows = environments ?? [];

  const urlForEnvironment = (key: string) => {
    if (key === "test") return urls.test;
    if (key === "staging") return urls.staging;
    return urls.production;
  };

  return (
    <div className="hi5-page space-y-5">
      <div className="hi5-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-60">
              Tenant admin
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Environments
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 opacity-75">
              Manage how this workspace is separated across Production, Test and Staging.
              Production is live, Test is safe to experiment in, and Staging is where changes
              can be reviewed before they are promoted.
            </p>
          </div>

          <Link href="/admin" className="hi5-btn-ghost w-auto text-sm">
            Back to Admin
          </Link>
        </div>
      </div>

      <div className="hi5-card p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Tenant" value={tenant.company_name || tenant.name || tenant.subdomain} />
          <Field label="Subdomain" value={tenant.subdomain} />
          <Field label="Status" value={tenant.status || "—"} />
          <Field label="Plan" value={tenant.plan || "—"} />
        </div>
      </div>

      {environmentRows.length ? (
        <div className="space-y-5">
          {environmentRows.map((environment: any) => (
            <EnvironmentCard
              key={environment.id}
              environment={environment}
              tenant={tenant}
              url={urlForEnvironment(String(environment.key))}
              states={statesByEnvironment.get(environment.id) ?? []}
            />
          ))}
        </div>
      ) : (
        <div className="hi5-panel p-5">
          <div className="text-lg font-extrabold">No environments found</div>
          <p className="mt-2 text-sm opacity-75">
            This tenant does not have environment rows yet. Complete onboarding again or create the
            default Test, Staging and Production rows from Platform Admin.
          </p>
        </div>
      )}

      <div className="hi5-card p-5">
        <div className="text-lg font-extrabold">Next step placeholder</div>
        <p className="mt-2 text-sm leading-6 opacity-75">
          The next pass will add selected staging changes, review before production, scheduled
          promotion and rollback placeholders.
        </p>
      </div>
    </div>
  );
}
