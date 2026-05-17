import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  calculateTrialDaysRemaining,
  getPricingPlan,
  normalisePlanKey,
} from "@/lib/billing/pricing";

export async function getTenantBillingProfile(tenantId: string) {
  const admin = supabaseAdmin();

  const { data: billing } = await admin
    .from("tenant_billing_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (billing) {
    const plan = getPricingPlan(billing.plan_key);

    return {
      billing,
      plan,
      daysRemaining: calculateTrialDaysRemaining(billing.trial_ends_at),
    };
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, onboarding_product, status, trial_ends_at, created_at")
    .eq("id", tenantId)
    .maybeSingle();

  const { data: settings } = await admin
    .from("tenant_settings")
    .select("support_email")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const planKey = normalisePlanKey(tenant?.onboarding_product);
  const plan = getPricingPlan(planKey);
  const trialEndsAt =
    tenant?.trial_ends_at ||
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: created } = await admin
    .from("tenant_billing_profiles")
    .upsert(
      {
        tenant_id: tenantId,
        plan_key: plan.key,
        billing_status: tenant?.status || "trial",
        trial_started_at: tenant?.created_at || new Date().toISOString(),
        trial_ends_at: trialEndsAt,
        billing_email: settings?.support_email || null,
        currency: "GBP",
        base_monthly_amount: plan.baseMonthly,
        per_technician_amount: plan.perTechnician,
        per_device_amount: plan.perDevice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    )
    .select("*")
    .single();

  return {
    billing: created,
    plan,
    daysRemaining: calculateTrialDaysRemaining(trialEndsAt),
  };
}

export async function getTenantFeatureMap(tenantId: string) {
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("tenant_entitlements")
    .select("feature_key, enabled")
    .eq("tenant_id", tenantId);

  const map: Record<string, boolean> = {};

  for (const row of data ?? []) {
    map[row.feature_key] = row.enabled === true;
  }

  return map;
}

export async function getTenantUsageCounts(tenantId: string) {
  const admin = supabaseAdmin();

  const [{ count: technicianCount }, { count: deviceCount }] = await Promise.all([
    admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    admin
      .from("devices")
      .select("device_id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  return {
    technicianCount: technicianCount ?? 0,
    deviceCount: deviceCount ?? 0,
  };
}

export async function createBillingChange({
  tenantId,
  fromPlan,
  toPlan,
  createdBy,
}: {
  tenantId: string;
  fromPlan: string;
  toPlan: string;
  createdBy?: string | null;
}) {
  const admin = supabaseAdmin();

  const fromPricing = getPricingPlan(fromPlan);
  const toPricing = getPricingPlan(toPlan);

  const { data, error } = await admin
    .from("tenant_billing_changes")
    .insert({
      tenant_id: tenantId,
      change_type: "plan_change",
      from_plan: fromPricing.key,
      to_plan: toPricing.key,
      from_features: {
        modules: fromPricing.includedModules,
        features: fromPricing.featureKeys,
      },
      to_features: {
        modules: toPricing.includedModules,
        features: toPricing.featureKeys,
      },
      status: "pending_approval",
      created_by: createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
