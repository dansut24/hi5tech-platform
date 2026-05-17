import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildTenantEnvironmentUrls, resolveTenantEnvironment } from "@/lib/tenant/environment-host";
import { FEATURE_CATALOG, getFeatureDefinition } from "@/lib/environments/feature-catalog";
import {
  ApplySelectedChangesButton,
  RemoveSelectedChangeButton,
  ScheduleSelectedChangesForm,
  SelectFeatureChangeButton,
} from "@/components/environments/staging-change-actions";

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

function prettyAction(action: string) {
  if (action === "enable") return "Enable";
  if (action === "disable") return "Disable";
  return action;
}

export default async function StagingChangesPage() {
  const resolved = await resolveTenantEnvironment();

  if (!resolved?.tenantId) {
    notFound();
  }

  const admin = supabaseAdmin();

  const urls = buildTenantEnvironmentUrls({
    subdomain: resolved.tenant.subdomain || resolved.tenantSubdomain || "",
    rootDomain: resolved.tenant.domain || resolved.rootDomain || "hi5tech.co.uk",
  });

  if (resolved.environmentKey !== "staging") {
    return (
      <div className="hi5-page space-y-5">
        <div className="hi5-panel p-5">
          <div className="text-xs uppercase tracking-[0.18em] opacity-60">
            Tenant admin
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Staging changes
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 opacity-75">
            Changes can only be selected, reviewed and applied from the staging environment.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <a href={urls.staging} className="hi5-btn-primary w-auto text-sm">
              Open staging environment
            </a>

            <Link href="/admin/environments" className="hi5-btn-ghost w-auto text-sm">
              Back to environments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: productionEnvironment } = await admin
    .from("tenant_environments")
    .select("id")
    .eq("tenant_id", resolved.tenantId)
    .eq("key", "production")
    .maybeSingle();

  const { data: productionStates } = productionEnvironment?.id
    ? await admin
        .from("tenant_feature_states")
        .select("feature_key, status, updated_at")
        .eq("tenant_id", resolved.tenantId)
        .eq("tenant_environment_id", productionEnvironment.id)
    : { data: [] };

  const productionStateMap = new Map<string, string>();

  for (const state of productionStates ?? []) {
    productionStateMap.set(state.feature_key, state.status);
  }

  const { data: changes } = await admin
    .from("tenant_environment_change_requests")
    .select("*")
    .eq("tenant_id", resolved.tenantId)
    .eq("source_environment_key", "staging")
    .eq("target_environment_key", "production")
    .in("status", ["selected", "scheduled"])
    .order("created_at", { ascending: true });

  const selectedChanges = changes ?? [];
  const selectedFeatureKeys = new Set(selectedChanges.map((change: any) => change.feature_key).filter(Boolean));

  return (
    <div className="hi5-page space-y-5">
      <div className="hi5-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-60">
              Staging environment
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Selected changes
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 opacity-75">
              Select feature changes in staging, review the detailed list, remove anything you do not want,
              then apply or schedule the changes for Production.
            </p>
          </div>

          <Link href="/admin/environments" className="hi5-btn-ghost w-auto text-sm">
            Back to environments
          </Link>
        </div>
      </div>

      <div className="hi5-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-lg font-extrabold">Review list</div>
            <p className="mt-2 text-sm opacity-75">
              {selectedChanges.length} change{selectedChanges.length === 1 ? "" : "s"} currently selected.
            </p>
          </div>

          <ApplySelectedChangesButton disabled={!selectedChanges.length} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {selectedChanges.length ? (
              selectedChanges.map((change: any) => {
                const feature = getFeatureDefinition(change.feature_key || "");
                const currentStatus = change.before_json?.production_status || "unknown";
                const targetStatus = change.after_json?.production_status || "unknown";

                return (
                  <div
                    key={change.id}
                    className="rounded-3xl border hi5-border bg-black/5 p-4 dark:bg-white/5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-black">
                            {change.summary}
                          </h2>

                          <StatusPill tone={change.status === "scheduled" ? "warning" : "good"}>
                            {change.status}
                          </StatusPill>

                          <StatusPill tone={change.action === "enable" ? "good" : "bad"}>
                            {prettyAction(change.action)}
                          </StatusPill>
                        </div>

                        <p className="mt-2 text-sm opacity-75">
                          {change.description || feature?.description || "No description available."}
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border hi5-border bg-white/45 p-3 dark:bg-black/20">
                            <div className="text-xs opacity-65">Feature</div>
                            <div className="mt-1 text-sm font-bold">{feature?.title || change.feature_key}</div>
                          </div>

                          <div className="rounded-2xl border hi5-border bg-white/45 p-3 dark:bg-black/20">
                            <div className="text-xs opacity-65">Production now</div>
                            <div className="mt-1 text-sm font-bold">{currentStatus}</div>
                          </div>

                          <div className="rounded-2xl border hi5-border bg-white/45 p-3 dark:bg-black/20">
                            <div className="text-xs opacity-65">After apply</div>
                            <div className="mt-1 text-sm font-bold">{targetStatus}</div>
                          </div>
                        </div>

                        {change.scheduled_for ? (
                          <div className="mt-3 text-xs opacity-65">
                            Scheduled for {formatDate(change.scheduled_for)}
                          </div>
                        ) : null}
                      </div>

                      <RemoveSelectedChangeButton changeId={change.id} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                No staging changes selected yet.
              </div>
            )}
          </div>

          <ScheduleSelectedChangesForm disabled={!selectedChanges.length} />
        </div>
      </div>

      <div className="hi5-panel p-5">
        <div className="text-lg font-extrabold">Available feature changes</div>
        <p className="mt-2 text-sm opacity-75">
          Select what you want to change in Production. Selected changes appear in the review list above.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {FEATURE_CATALOG.map((feature) => {
            const productionStatus = productionStateMap.get(feature.key) || "disabled";
            const alreadySelected = selectedFeatureKeys.has(feature.key);
            const isLive = productionStatus === "live";

            return (
              <div
                key={feature.key}
                className="rounded-3xl border hi5-border bg-black/5 p-4 dark:bg-white/5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black">{feature.title}</h2>
                      <StatusPill>{feature.module}</StatusPill>
                      <StatusPill tone={isLive ? "good" : "bad"}>
                        Production: {productionStatus}
                      </StatusPill>
                      {alreadySelected ? (
                        <StatusPill tone="warning">Already selected</StatusPill>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm opacity-75">{feature.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!alreadySelected && !isLive ? (
                      <SelectFeatureChangeButton featureKey={feature.key} action="enable" />
                    ) : null}

                    {!alreadySelected && isLive ? (
                      <SelectFeatureChangeButton featureKey={feature.key} action="disable" />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
