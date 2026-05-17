// apps/app/src/lib/tenant/environment-host.ts
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export type TenantEnvironmentKey = "production" | "test" | "staging";

export type TenantEnvironmentHost = {
  rootDomain: string;
  hostSubdomain: string | null;
  tenantSubdomain: string | null;
  environmentKey: TenantEnvironmentKey;
  isPlatformAdminHost: boolean;
  isTenantHost: boolean;
};

export type ResolvedTenantEnvironment = TenantEnvironmentHost & {
  tenantId: string;
  tenant: {
    id: string;
    name?: string | null;
    company_name?: string | null;
    domain?: string | null;
    subdomain?: string | null;
    status?: string | null;
    plan?: string | null;
    trial_ends_at?: string | null;
  };
  environment: {
    id: string;
    key: TenantEnvironmentKey;
    name?: string | null;
    type?: string | null;
    can_reset?: boolean | null;
    all_features_visible?: boolean | null;
    is_live?: boolean | null;
  } | null;
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";

export const RESERVED_TENANT_SUBDOMAINS = new Set([
  "admin",
  "app",
  "www",
  "api",
  "auth",
  "billing",
  "support",
  "status",
  "rmm",
  "control",
  "mail",
  "cdn",
  "assets",
  "test",
  "stg",
  "stage",
  "staging",
  "prod",
  "production",
]);

export function parseEnvironmentSubdomain(subdomain?: string | null): {
  tenantSubdomain: string | null;
  environmentKey: TenantEnvironmentKey;
} {
  const raw = String(subdomain ?? "").trim().toLowerCase();

  if (!raw) {
    return {
      tenantSubdomain: null,
      environmentKey: "production",
    };
  }

  if (raw.startsWith("test-")) {
    const tenantSubdomain = raw.slice("test-".length).trim();

    return {
      tenantSubdomain: tenantSubdomain || null,
      environmentKey: "test",
    };
  }

  if (raw.startsWith("stg-")) {
    const tenantSubdomain = raw.slice("stg-".length).trim();

    return {
      tenantSubdomain: tenantSubdomain || null,
      environmentKey: "staging",
    };
  }

  return {
    tenantSubdomain: raw,
    environmentKey: "production",
  };
}

export function buildTenantEnvironmentUrls({
  subdomain,
  rootDomain = ROOT_DOMAIN,
}: {
  subdomain: string;
  rootDomain?: string;
}) {
  const clean = String(subdomain || "").trim().toLowerCase();

  return {
    production: `https://${clean}.${rootDomain}`,
    test: `https://test-${clean}.${rootDomain}`,
    staging: `https://stg-${clean}.${rootDomain}`,
  };
}

export function isReservedTenantSubdomain(value: string) {
  const clean = String(value || "").trim().toLowerCase();

  if (!clean) return true;
  if (RESERVED_TENANT_SUBDOMAINS.has(clean)) return true;

  /*
    These are environment aliases. Customers should not be able to register them
    directly because test-acme/stg-acme belong to tenant "acme".
  */
  if (clean.startsWith("test-")) return true;
  if (clean.startsWith("stg-")) return true;

  return false;
}

export async function getTenantEnvironmentHost(): Promise<TenantEnvironmentHost> {
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  const hostSubdomain = parsed.subdomain || null;

  if (hostSubdomain === "admin") {
    return {
      rootDomain: parsed.rootDomain || ROOT_DOMAIN,
      hostSubdomain,
      tenantSubdomain: null,
      environmentKey: "production",
      isPlatformAdminHost: true,
      isTenantHost: false,
    };
  }

  const env = parseEnvironmentSubdomain(hostSubdomain);

  return {
    rootDomain: parsed.rootDomain || ROOT_DOMAIN,
    hostSubdomain,
    tenantSubdomain: env.tenantSubdomain,
    environmentKey: env.environmentKey,
    isPlatformAdminHost: false,
    isTenantHost: Boolean(env.tenantSubdomain),
  };
}

export async function resolveTenantEnvironment(): Promise<ResolvedTenantEnvironment | null> {
  const parsed = await getTenantEnvironmentHost();

  if (!parsed.isTenantHost || !parsed.tenantSubdomain) {
    return null;
  }

  const supabase = await supabaseServer();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, company_name, domain, subdomain, status, plan, trial_ends_at")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.tenantSubdomain)
    .maybeSingle();

  if (!tenant?.id) {
    return null;
  }

  const { data: environment } = await supabase
    .from("tenant_environments")
    .select("id, key, name, type, can_reset, all_features_visible, is_live")
    .eq("tenant_id", tenant.id)
    .eq("key", parsed.environmentKey)
    .maybeSingle();

  return {
    ...parsed,
    tenantId: tenant.id,
    tenant,
    environment:
      environment && ["production", "test", "staging"].includes(String(environment.key))
        ? {
            ...environment,
            key: environment.key as TenantEnvironmentKey,
          }
        : null,
  };
}
