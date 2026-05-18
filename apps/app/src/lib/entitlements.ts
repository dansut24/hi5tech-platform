import { supabaseServer } from "@/lib/supabase/server";
import { resolveTenantEnvironment, type TenantEnvironmentKey } from "@/lib/tenant/environment-host";

export type FeatureKey =
  | "itsm_core"
  | "devices_ticket_context"
  | "devices_inventory"
  | "devices_reporting"
  | "remote_control"
  | "remote_terminal"
  | "remote_files"
  | "scripts"
  | "monitoring"
  | "patch_management"
  | "automation";

export type FeatureMap = Record<FeatureKey, boolean>;

export const ALL_FEATURE_KEYS: FeatureKey[] = [
  "itsm_core",
  "devices_ticket_context",
  "devices_inventory",
  "devices_reporting",
  "remote_control",
  "remote_terminal",
  "remote_files",
  "scripts",
  "monitoring",
  "patch_management",
  "automation",
];

const EMPTY_FEATURES = Object.fromEntries(
  ALL_FEATURE_KEYS.map((key) => [key, false])
) as FeatureMap;

const ALL_ENABLED_FEATURES = Object.fromEntries(
  ALL_FEATURE_KEYS.map((key) => [key, true])
) as FeatureMap;

function emptyFeatures(): FeatureMap {
  return { ...EMPTY_FEATURES };
}

function allEnabledFeatures(): FeatureMap {
  return { ...ALL_ENABLED_FEATURES };
}

function isFeatureEnabledForEnvironmentStatus({
  environmentKey,
  status,
}: {
  environmentKey: TenantEnvironmentKey;
  status: string;
}) {
  const s = String(status || "").trim().toLowerCase();

  if (environmentKey === "production") {
    return s === "live";
  }

  if (environmentKey === "staging") {
    return s === "available" || s === "selected" || s === "staged" || s === "live";
  }

  return s !== "disabled";
}

export async function getTenantFeatures(tenantId: string) {
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("tenant_entitlements")
    .select("feature_key, enabled")
    .eq("tenant_id", tenantId);

  const features = emptyFeatures();

  for (const row of data ?? []) {
    const key = row.feature_key as FeatureKey;
    if (ALL_FEATURE_KEYS.includes(key)) {
      features[key] = row.enabled === true;
    }
  }

  return features;
}

export async function getTenantEnvironmentFeatures({
  tenantId,
  environmentId,
  environmentKey,
}: {
  tenantId: string;
  environmentId?: string | null;
  environmentKey: TenantEnvironmentKey;
}) {
  if (environmentKey === "test") {
    return allEnabledFeatures();
  }

  const supabase = await supabaseServer();

  if (environmentId) {
    const { data } = await supabase
      .from("tenant_feature_states")
      .select("feature_key, status")
      .eq("tenant_id", tenantId)
      .eq("tenant_environment_id", environmentId);

    const features = emptyFeatures();

    for (const row of data ?? []) {
      const key = row.feature_key as FeatureKey;
      if (ALL_FEATURE_KEYS.includes(key)) {
        features[key] = isFeatureEnabledForEnvironmentStatus({
          environmentKey,
          status: String(row.status || ""),
        });
      }
    }

    return features;
  }

  return getTenantFeatures(tenantId);
}

export async function getActiveEnvironmentFeatures(tenantId?: string) {
  const resolved = await resolveTenantEnvironment().catch(() => null);

  if (resolved?.tenantId && (!tenantId || resolved.tenantId === tenantId)) {
    return getTenantEnvironmentFeatures({
      tenantId: resolved.tenantId,
      environmentId: resolved.environment?.id,
      environmentKey: resolved.environmentKey,
    });
  }

  if (tenantId) {
    return getTenantFeatures(tenantId);
  }

  return emptyFeatures();
}

export function canUseFeature(features: Partial<Record<FeatureKey, boolean>>, featureKey: FeatureKey) {
  return features[featureKey] === true;
}

export async function hasFeature(tenantId: string, featureKey: FeatureKey) {
  const features = await getTenantFeatures(tenantId);
  return features[featureKey] === true;
}

export async function hasActiveEnvironmentFeature(tenantId: string, featureKey: FeatureKey) {
  const features = await getActiveEnvironmentFeatures(tenantId);
  return features[featureKey] === true;
}
