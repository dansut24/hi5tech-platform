import { supabaseAdmin } from "@/lib/supabase/admin";

export type OnboardingProduct = "itsm" | "control" | "both";

export type TenantSignupIntent = {
  id: string;
  company_name: string;
  subdomain: string;
  root_domain: string;
  admin_name: string;
  admin_email: string;
  status: string;
  auth_user_id?: string | null;
  created_tenant_id?: string | null;
};

export type SetupOptions = {
  companyName?: string;
  supportEmail?: string;
  region?: string;
  accentColor?: string;
  appearance?: string;
  useItsmDefaults?: boolean;
  useControlDefaults?: boolean;
  invites?: Array<{
    email: string;
    role: string;
  }>;
};

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

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
  if (product === "itsm") return ["itsm", "selfservice", "admin"];
  if (product === "control") return ["control", "admin"];
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

function cleanText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function validInviteRole(value: string) {
  return ["admin", "technician", "viewer"].includes(value) ? value : "technician";
}

function validAccent(value: string) {
  return ["neutral", "violet", "blue", "emerald", "rose", "orange", "custom"].includes(value)
    ? value
    : "neutral";
}

function validAppearance(value: string) {
  return ["light", "dark", "system"].includes(value) ? value : "system";
}

async function createTenantFromIntent(intent: TenantSignupIntent, userId: string, product: OnboardingProduct) {
  const admin = supabaseAdmin();

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const payload = {
    name: intent.company_name,
    company_name: intent.company_name,
    domain: intent.root_domain || ROOT_DOMAIN,
    subdomain: intent.subdomain,
    status: "trial",
    plan: "trial",
    is_active: true,
    trial_ends_at: trialEndsAt,
    created_by: userId,
    onboarding_product: product,
    onboarding_completed_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("tenants")
    .insert(payload)
    .select("id, name, company_name, domain, subdomain, status, plan, trial_ends_at")
    .single();

  if (!error && data) {
    return data;
  }

  const minimalPayload = {
    name: intent.company_name,
    domain: intent.root_domain || ROOT_DOMAIN,
    subdomain: intent.subdomain,
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

export async function completeTenantWorkspaceFromIntent({
  intent,
  userId,
  email,
  product,
  timezone,
  setup,
}: {
  intent: TenantSignupIntent;
  userId: string;
  email: string;
  product: OnboardingProduct;
  timezone: string;
  setup?: SetupOptions;
}) {
  const admin = supabaseAdmin();

  if (!["itsm", "control", "both"].includes(product)) {
    throw new Error("Invalid product selection");
  }

  const companyName = cleanText(setup?.companyName, intent.company_name);
  const supportEmail = cleanEmail(setup?.supportEmail || intent.admin_email || email);
  const region = cleanText(setup?.region, "United Kingdom");
  const accentColor = validAccent(cleanText(setup?.accentColor, "neutral"));
  const appearance = validAppearance(cleanText(setup?.appearance, "system"));
  const useItsmDefaults = setup?.useItsmDefaults !== false;
  const useControlDefaults = setup?.useControlDefaults !== false;

  if (intent.status === "completed" && intent.created_tenant_id) {
    return {
      tenant: {
        id: intent.created_tenant_id,
        subdomain: intent.subdomain,
        domain: intent.root_domain || ROOT_DOMAIN,
      },
      product,
      productLabel: productLabel(product),
      tenantUrl: `https://${intent.subdomain}.${intent.root_domain || ROOT_DOMAIN}`,
      alreadyCompleted: true,
    };
  }

  const { data: existingTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("domain", intent.root_domain || ROOT_DOMAIN)
    .eq("subdomain", intent.subdomain)
    .maybeSingle();

  if (existingTenant?.id) {
    throw new Error("This workspace URL is already active");
  }

  const tenant = await createTenantFromIntent(
    {
      ...intent,
      company_name: companyName,
    },
    userId,
    product
  );

  await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: intent.admin_name || email,
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
        user_id: userId,
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
      support_email: supportEmail,
      timezone: timezone || "Europe/London",
      default_region: region,

      // New theme settings
      default_appearance: appearance,
      accent_color: accentColor,
      theme_preset: accentColor === "custom" ? "custom" : accentColor,

      onboarding_completed: true,
      onboarding_complete: true,
      setup_completed_at: new Date().toISOString(),
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
          updated_by: userId,
        });
      }
    }

    await admin.from("tenant_feature_states").upsert(featureRows, {
      onConflict: "tenant_environment_id,feature_key",
    });
  }

  if ((product === "itsm" || product === "both") && useItsmDefaults) {
    await admin.from("tenant_itsm_defaults").upsert(
      {
        tenant_id: tenant.id,
        priorities: ["Low", "Medium", "High", "Critical"],
        statuses: ["Open", "In Progress", "Resolved", "Closed"],
        categories: ["Hardware", "Software", "Access", "Network", "Other"],
        sla_profile: {
          low_hours: 72,
          medium_hours: 48,
          high_hours: 24,
          critical_hours: 4,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" }
    );
  }

  if ((product === "control" || product === "both") && useControlDefaults) {
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

  const inviteRows =
    setup?.invites
      ?.map((invite) => ({
        tenant_id: tenant.id,
        email: cleanEmail(invite.email),
        role: validInviteRole(invite.role),
        invited_by: userId,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }))
      .filter((invite) => invite.email && invite.email.includes("@") && invite.email !== cleanEmail(email)) ?? [];

  if (inviteRows.length) {
    await admin.from("tenant_invites").upsert(inviteRows, {
      onConflict: "tenant_id,email",
    });
  }

  await admin
    .from("tenant_signup_intents")
    .update({
      status: "completed",
      created_tenant_id: tenant.id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", intent.id);

  return {
    tenant,
    membership,
    modules,
    product,
    productLabel: productLabel(product),
    tenantUrl: `https://${tenant.subdomain}.${tenant.domain || ROOT_DOMAIN}`,
  };
}
