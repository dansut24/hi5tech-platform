import { supabaseServer } from "@/lib/supabase/server";

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

export async function getTenantFeatures(tenantId: string) {
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("tenant_entitlements")
    .select("feature_key, enabled")
    .eq("tenant_id", tenantId);

  const features = {} as Record<FeatureKey, boolean>;

  for (const row of data ?? []) {
    features[row.feature_key as FeatureKey] = row.enabled === true;
  }

  return features;
}

export async function hasFeature(tenantId: string, featureKey: FeatureKey) {
  const features = await getTenantFeatures(tenantId);
  return features[featureKey] === true;
}
