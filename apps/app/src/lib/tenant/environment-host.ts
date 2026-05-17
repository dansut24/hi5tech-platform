// apps/app/src/lib/tenant/environment-host.ts
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

export type TenantEnvironmentKey = "production" | "test" | "staging";

export type TenantEnvironmentHost = {
  rootDomain: string;
  host: string;
  hostSubdomain: string | null;
  tenantSubdomain: string | null;
  environmentKey: TenantEnvironmentKey;
  isPlatformAdminHost: boolean;
  isAppHost: boolean;
  isRootMarketingHost: boolean;
  isReservedHost: boolean;
  isCustomDomainHost: boolean;
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
  customDomain?: {
    id: string;
    domain: string;
    environment_key: TenantEnvironmentKey;
    status: string;
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

function cleanHost(value: string) {
  return String(value || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function getSubdomainFromHost(host: string, rootDomain = ROOT_DOMAIN) {
  const h = cleanHost(host);
  const root = cleanHost(rootDomain);

  if (!h || !root) return null;
  if (h === root) return null;

  if (h.endsWith(`.${root}`)) {
    const sub = h.slice(0, -(root.length + 1)).trim();
    return sub || null;
  }

  return null;
}

function isExternalCustomDomain(host: string) {
  const h = cleanHost(host);

  if (!h) return false;
  if (h === "localhost") return false;
  if (h.endsWith(".localhost")) return false;
  if (h.endsWith(".vercel.app")) return false;
  if (h === ROOT_DOMAIN) return false;
  if (h.endsWith(`.${ROOT_DOMAIN}`)) return false;

  return h.includes(".");
}

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

  if (raw.endsWith("-test")) {
    const tenantSubdomain = raw.slice(0, -"-test".length).trim();

    return {
      tenantSubdomain: tenantSubdomain || null,
      environmentKey: "test",
    };
  }

  if (raw.endsWith("-stg")) {
    const tenantSubdomain = raw.slice(0, -"-stg".length).trim();

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
    test: `https://${clean}-test.${rootDomain}`,
    staging: `https://${clean}-stg.${rootDomain}`,
  };
}

export function isReservedTenantSubdomain(value: string) {
  const clean = String(value || "").trim().toLowerCase();

  if (!clean) return true;
  if (RESERVED_TENANT_SUBDOMAINS.has(clean)) return true;

  if (clean.endsWith("-test")) return true;
  if (clean.endsWith("-stg")) return true;

  if (clean.startsWith("test-")) return true;
  if (clean.startsWith("stg-")) return true;

  return false;
}

export async function getTenantEnvironmentHost(): Promise<TenantEnvironmentHost> {
  const host = cleanHost(getEffectiveHost(await headers()));

  const parsed = parseTenantHost(host);
  const rawSubdomain = getSubdomainFromHost(host, ROOT_DOMAIN);
  const hostSubdomain = rawSubdomain || parsed.subdomain || null;
  const rootDomain = parsed.rootDomain || ROOT_DOMAIN;

  const isRootMarketingHost =
    host === ROOT_DOMAIN ||
    host === `www.${ROOT_DOMAIN}`;

  const isPlatformAdminHost = hostSubdomain === "admin";
  const isAppHost = hostSubdomain === "app";
  const isCustomDomainHost = isExternalCustomDomain(host);

  const isReservedHost =
    Boolean(hostSubdomain) &&
    RESERVED_TENANT_SUBDOMAINS.has(String(hostSubdomain)) &&
    !isPlatformAdminHost &&
    !isAppHost;

  if (isPlatformAdminHost) {
    return {
      rootDomain,
      host,
      hostSubdomain,
      tenantSubdomain: null,
      environmentKey: "production",
      isPlatformAdminHost: true,
      isAppHost: false,
      isRootMarketingHost,
      isReservedHost: false,
      isCustomDomainHost: false,
      isTenantHost: false,
    };
  }

  if (isAppHost) {
    return {
      rootDomain,
      host,
      hostSubdomain,
      tenantSubdomain: null,
      environmentKey: "production",
      isPlatformAdminHost: false,
      isAppHost: true,
      isRootMarketingHost,
      isReservedHost: false,
      isCustomDomainHost: false,
      isTenantHost: false,
    };
  }

  if (isCustomDomainHost) {
    return {
      rootDomain,
      host,
      hostSubdomain,
      tenantSubdomain: null,
      environmentKey: "production",
      isPlatformAdminHost: false,
      isAppHost: false,
      isRootMarketingHost: false,
      isReservedHost: false,
      isCustomDomainHost: true,
      isTenantHost: true,
    };
  }

  if (isRootMarketingHost || isReservedHost) {
    return {
      rootDomain,
      host,
      hostSubdomain,
      tenantSubdomain: null,
      environmentKey: "production",
      isPlatformAdminHost: false,
      isAppHost: false,
      isRootMarketingHost,
      isReservedHost,
      isCustomDomainHost: false,
      isTenantHost: false,
    };
  }

  const env = parseEnvironmentSubdomain(hostSubdomain);

  return {
    rootDomain,
    host,
    hostSubdomain,
    tenantSubdomain: env.tenantSubdomain,
    environmentKey: env.environmentKey,
    isPlatformAdminHost: false,
    isAppHost: false,
    isRootMarketingHost,
    isReservedHost: false,
    isCustomDomainHost: false,
    isTenantHost: Boolean(env.tenantSubdomain),
  };
}

export async function resolveTenantEnvironment(): Promise<ResolvedTenantEnvironment | null> {
  const parsed = await getTenantEnvironmentHost();

  if (!parsed.isTenantHost) {
    return null;
  }

  const supabase = await supabaseServer();

  if (parsed.isCustomDomainHost) {
    const admin = supabaseAdmin();

    const { data: domainRow } = await admin
      .from("tenant_custom_domains")
      .select("id, tenant_id, domain, environment_key, status")
      .eq("domain", parsed.host)
      .in("status", ["verified", "active"])
      .maybeSingle();

    if (!domainRow?.tenant_id) {
      return null;
    }

    const environmentKey = (
      ["production", "test", "staging"].includes(String(domainRow.environment_key))
        ? domainRow.environment_key
        : "production"
    ) as TenantEnvironmentKey;

    const { data: tenant } = await admin
      .from("tenants")
      .select("id, name, company_name, domain, subdomain, status, plan, trial_ends_at")
      .eq("id", domainRow.tenant_id)
      .maybeSingle();

    if (!tenant?.id) {
      return null;
    }

    const { data: environment } = await admin
      .from("tenant_environments")
      .select("id, key, name, type, can_reset, all_features_visible, is_live")
      .eq("tenant_id", tenant.id)
      .eq("key", environmentKey)
      .maybeSingle();

    return {
      ...parsed,
      tenantId: tenant.id,
      tenantSubdomain: tenant.subdomain ?? null,
      environmentKey,
      tenant,
      environment:
        environment && ["production", "test", "staging"].includes(String(environment.key))
          ? {
              ...environment,
              key: environment.key as TenantEnvironmentKey,
            }
          : null,
      customDomain: {
        id: domainRow.id,
        domain: domainRow.domain,
        environment_key: environmentKey,
        status: domainRow.status,
      },
    };
  }

  if (!parsed.tenantSubdomain) {
    return null;
  }

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
    customDomain: null,
  };
}
