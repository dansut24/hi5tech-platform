import { supabaseAdmin } from "@/lib/supabase/admin";

export type OnboardingProduct = "itsm" | "control" | "both";

export type CreateTenantWorkspaceInput = {
  userId: string;
  email: string;
  fullName?: string | null;
  companyName: string;
  subdomain: string;
  product: OnboardingProduct;
  timezone?: string | null;
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

export function normalizeSubdomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}

export function productLabel(product: OnboardingProduct) {
  if (product === "itsm") return "ITSM only";
  if (product === "control") return "RMM Control only";
  return "ITSM + RMM Control";
}

export function getProductModules(product: OnboardingProduct) {
  if (product === "itsm") {
    return ["itsm", "selfservice", "admin"];
  }

  if (product === "control") {
    return ["control", "admin"];
  }

  return ["itsm", "control", "selfservice", "admin"];
}

export function getProductEntitlements(product: OnboardingProduct) {
  const base = {
    itsm_core: false,
    devices_ticket_context: false,
    devices_inventory: false,
    devices_reporting: false,
    remote_control: false,
    remote_terminal: false,
    remote_files: false,
    scripts: false,
    monitoring: false,
    patch_management: false,
    automation: false,
  };

  if (product === "itsm") {
    return {
      ...base,
      itsm_core: true,
    };
  }

  if (product === "control") {
    return {
      ...base,
      devices_inventory: true,
      devices_reporting: true,
      remote_control: true,
      remote_terminal: true,
      remote_files: true,
      scripts: true,
      monitoring: true,
    };
  }

  return {
    ...base,
    itsm_core: true,
    devices_ticket_context: true,
    devices_inventory: true,
    devices_reporting: true,
    remote_control: true,
    remote_terminal: true,
    remote_files: true,
    scripts: true,
    monitoring: true,
  };
}

async function insertTenant(input: CreateTenantWorkspaceInput) {
  const admin = supabaseAdmin();

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const fullPayload = {
    name: input.companyName,
    company_name: input.companyName,
    domain: ROOT_DOMAIN,
    subdomain: input.subdomain,
    status: "trial",
    plan: "trial",
    is_active: true,
    trial_ends_at: trialEndsAt,
    created_by: input.userId,
    onboarding_product: input.product,
    onboarding_completed_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("tenants")
    .insert(fullPayload)
    .select("id, name, company_name, domain, subdomain, status, plan, trial_ends_at")
    .single();

  if (!error && data) return data;

  const minimalPayload = {
    name: input.companyName,
    domain: ROOT_DOMAIN,
    subdomain: input.subdomain,
    is_active: true,
  };

  const retry = await admin
    .from("tenants")
    .insert(minimalPayload)
    .select("id, name, domain, subdomain")
    .single();

  if (retry.error || !retry.data) {
    throw new Error(error?.message || retry.error?.message || "Failed to create tenant");
  }

  return retry.data;
}

export async function createTenantWorkspace(input: CreateTenantWorkspaceInput) {
  const admin = supabaseAdmin();

  const companyName = input.companyName.trim();
  const subdomain = normalizeSubdomain(input.subdomain);
  const product = input.product;

  if (!companyName) {
    throw new Error("Company name is required");
  }

  if (!subdomain || subdomain.length < 3) {
    throw new Error("Workspace URL must be at least 3 characters");
  }

  if (!["itsm", "control", "both"].includes(product)) {
    throw new Error("Invalid product selection");
  }

  const { data: existing } = await admin
    .from("tenants")
    .select("id")
    .eq("domain", ROOT_DOMAIN)
    .eq("subdomain", subdomain)
    .maybeSingle();

  if (existing?.id) {
    throw new Error("That workspace URL is already taken");
  }

  const tenant = await insertTenant({
    ...input,
    companyName,
    subdomain,
    product,
  });

  await admin.from("profiles").upsert(
    {
      id: input.userId,
      email: input.email,
      full_name: input.fullName || input.email,
      tenant_id: tenant.id,
      created_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  const { data: membership, error: membershipError } = await admin
    .from("memberships")
    .upsert(
      {
        tenant_id: tenant.id,
        user_id: input.userId,
        role: "owner",
        created_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,user_id" }
    )
    .select("id, tenant_id, user_id, role")
    .single();

  if (membershipError || !membership?.id) {
    throw new Error(membershipError?.message || "Failed to create owner membership");
  }

  const modules = getProductModules(product);

  await admin.from("module_assignments").upsert(
    modules.map((module) => ({
      membership_id: membership.id,
      module,
    })),
    { onConflict: "membership_id,module" }
  );

  await admin.from("tenant_settings").upsert(
    {
      tenant_id: tenant.id,
      company_name: companyName,
      timezone: input.timezone || "Europe/London",
      onboarding_completed: true,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );

  const entitlementMap = getProductEntitlements(product);

  await admin.from("tenant_entitlements").upsert(
    Object.entries(entitlementMap).map(([feature_key, enabled]) => ({
      tenant_id: tenant.id,
      feature_key,
      enabled,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "tenant_id,feature_key" }
  );

  await admin.from("tenant_environments").upsert(
    [
      {
        tenant_id: tenant.id,
        key: "test",
        name: "Test",
        type: "sandbox",
        can_reset: true,
        all_features_visible: true,
        is_live: false,
        sort_order: 10,
      },
      {
        tenant_id: tenant.id,
        key: "staging",
        name: "Staging",
        type: "staging",
        can_reset: false,
        all_features_visible: true,
        is_live: false,
        sort_order: 20,
      },
      {
        tenant_id: tenant.id,
        key: "production",
        name: "Production",
        type: "production",
        can_reset: false,
        all_features_visible: false,
        is_live: true,
        sort_order: 30,
      },
    ],
    { onConflict: "tenant_id,key" }
  );

  const { data: environments } = await admin
    .from("tenant_environments")
    .select("id, key")
    .eq("tenant_id", tenant.id);

  if (environments?.length) {
    const featureRows = [];

    for (const environment of environments) {
      for (const [feature_key, enabled] of Object.entries(entitlementMap)) {
        featureRows.push({
          tenant_id: tenant.id,
          tenant_environment_id: environment.id,
          feature_key,
          status:
            environment.key === "production"
              ? enabled
                ? "live"
                : "disabled"
              : "available",
          config_json: {},
          layout_json: {},
          updated_by: input.userId,
        });
      }
    }

    await admin.from("tenant_feature_states").upsert(featureRows, {
      onConflict: "tenant_environment_id,feature_key",
    });
  }

  if (product === "control" || product === "both") {
    await admin.from("device_groups").upsert(
      [
        {
          tenant_id: tenant.id,
          name: "Windows Laptops",
          slug: "windows-laptops",
          description: "Default laptop device group",
        },
        {
          tenant_id: tenant.id,
          name: "Windows Desktops",
          slug: "windows-desktops",
          description: "Default desktop device group",
        },
        {
          tenant_id: tenant.id,
          name: "Windows Servers",
          slug: "windows-servers",
          description: "Default server device group",
        },
      ],
      { onConflict: "tenant_id,slug" }
    );
  }

  return {
    tenant,
    membership,
    modules,
    product,
    productLabel: productLabel(product),
    tenantUrl: `https://${tenant.subdomain}.${tenant.domain || ROOT_DOMAIN}`,
  };
}
