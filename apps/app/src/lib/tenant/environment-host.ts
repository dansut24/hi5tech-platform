// apps/app/src/lib/tenant/environment-host.ts
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  cleanHost,
  getEffectiveHost,
  normalizeTenantEnvironmentSubdomain,
  parseTenantHost,
  type TenantEnvironmentKey,
} from "@/lib/tenant/tenant-from-host";

export type { TenantEnvironmentKey };

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

export type TenantEnvironmentHost = {
  rootDomain: string;
  host: string;
  hostSubdomain: string | null;
  tenantSubdomain: string | null;
  requestedSubdomain: string | null;
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

function getSubdomainFromRootHost(host: string, rootDomain = ROOT_DOMAIN) {
  const h = cleanHost(host);
  const root = cleanHost(rootDomain);

  if (!h || !root) return null;
  if (h === root) return null;

  if (!h.endsWith(`.${root}`)) return null;

  const sub = h.slice(0, -`.${root}`.length).trim();
  return sub || null;
}

export function parseEnvironmentSubdomain(subdomain?: string | null): {
  tenantSubdomain: string | null;
  requestedSubdomain: string | null;
  environmentKey: TenantEnvironmentKey;
} {
  const parsed = normalizeTenantEnvironmentSubdomain(subdomain);

  return {
    tenantSubdomain: parsed.subdomain,
    requestedSubdomain: parsed.requestedSubdomain,
    environmentKey: parsed.environmentKey,
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

function normalizeEnvironmentKey(value: unknown): TenantEnvironmentKey {
  const raw = String(value || "").toLowerCase();

  if (raw === "test") return "test";
  if (raw === "staging") return "staging";
  if (raw === "stg") return "staging";

  return "production";
}

export async function getTenantEnvironmentHost(): Promise<TenantEnvironmentHost> {
  const h = await headers();
  const host = cleanHost(getEffectiveHost(h));

  const parsed = parseTenantHost(host);
  const hostSubdomain = getSubdomainFromRootHost(host, ROOT_DOMAIN);

  const isRootMarketingHost =
    parsed.isRootHost ||
    host === ROOT_DOMAIN ||
    host === `www.${ROOT_DOMAIN}`;

  const isPlatformAdminHost = parsed.isPlatformAdminHost;
  const isAppHost = parsed.isAppHost;
  const isCustomDomainHost = parsed.isCustomDomainHost;

  const isReservedHost =
    Boolean(hostSubdomain) &&
    RESERVED_TENANT_SUBDOMAINS.has(String(hostSubdomain)) &&
    !isPlatformAdminHost &&
    !isAppHost;

  return {
    rootDomain: ROOT_DOMAIN,
    host,
    hostSubdomain,
    tenantSubdomain: parsed.subdomain,
    requestedSubdomain: parsed.requestedSubdomain,
    environmentKey: parsed.environmentKey,
    isPlatformAdminHost,
    isAppHost,
    isRootMarketingHost,
    isReservedHost,
    isCustomDomainHost,
    isTenantHost: parsed.isTenantHost && !isReservedHost,
  };
}

export async function resolveTenantEnvironment(): Promise<ResolvedTenantEnvironment | null> {
  const hostInfo = await getTenantEnvironmentHost();

  if (!hostInfo.isTenantHost) {
    return null;
  }

  if (hostInfo.isReservedHost) {
    return null;
  }

  if (hostInfo.isCustomDomainHost) {
    const admin = supabaseAdmin();

    const { data: domainRow } = await admin
      .from("tenant_custom_domains")
      .select("id, tenant_id, domain, environment_key, status")
      .eq("domain", hostInfo.host)
      .in("status", ["verified", "active"])
      .maybeSingle();

    if (!domainRow?.tenant_id) {
      return null;
    }

    const environmentKey = normalizeEnvironmentKey(domainRow.environment_key);

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
      ...hostInfo,
      tenantId: tenant.id,
      tenantSubdomain: tenant.subdomain ?? null,
      requestedSubdomain: tenant.subdomain ?? null,
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

  if (!hostInfo.tenantSubdomain) {
    return null;
  }

  const supabase = await supabaseServer();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, company_name, domain, subdomain, status, plan, trial_ends_at")
    .eq("domain", hostInfo.rootDomain)
    .eq("subdomain", hostInfo.tenantSubdomain)
    .maybeSingle();

  if (!tenant?.id) {
    return null;
  }

  const { data: environment } = await supabase
    .from("tenant_environments")
    .select("id, key, name, type, can_reset, all_features_visible, is_live")
    .eq("tenant_id", tenant.id)
    .eq("key", hostInfo.environmentKey)
    .maybeSingle();

  return {
    ...hostInfo,
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
