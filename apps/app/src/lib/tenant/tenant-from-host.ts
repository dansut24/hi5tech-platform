// apps/app/src/lib/tenant/tenant-from-host.ts

export type TenantEnvironmentKey = "production" | "test" | "staging";

export type TenantHost = {
  host: string;
  rootDomain: string;
  subdomain: string | null;
  requestedSubdomain: string | null;
  environmentKey: TenantEnvironmentKey;
  isRootHost: boolean;
  isAppHost: boolean;
  isPlatformAdminHost: boolean;
  isTenantHost: boolean;
  isPreviewHost: boolean;
  isLocalHost: boolean;
  isCustomDomainHost: boolean;
};

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk")
  .trim()
  .toLowerCase();

export function cleanHost(inputHost: string | null | undefined) {
  return String(inputHost || "")
    .trim()
    .toLowerCase()
    .split(",")[0]
    .split(":")[0];
}

export function getEffectiveHost(headers: Headers) {
  return (
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    headers.get("x-vercel-deployment-url") ||
    ""
  );
}

export function normalizeTenantEnvironmentSubdomain(rawSubdomain: string | null | undefined): {
  subdomain: string | null;
  requestedSubdomain: string | null;
  environmentKey: TenantEnvironmentKey;
} {
  const requestedSubdomain = String(rawSubdomain || "")
    .trim()
    .toLowerCase();

  if (!requestedSubdomain) {
    return {
      subdomain: null,
      requestedSubdomain: null,
      environmentKey: "production",
    };
  }

  if (requestedSubdomain.endsWith("-test")) {
    const base = requestedSubdomain.slice(0, -"-test".length).trim();

    return {
      subdomain: base || null,
      requestedSubdomain,
      environmentKey: "test",
    };
  }

  if (requestedSubdomain.endsWith("-stg")) {
    const base = requestedSubdomain.slice(0, -"-stg".length).trim();

    return {
      subdomain: base || null,
      requestedSubdomain,
      environmentKey: "staging",
    };
  }

  return {
    subdomain: requestedSubdomain,
    requestedSubdomain,
    environmentKey: "production",
  };
}

export function parseTenantHost(inputHost: string | null | undefined): TenantHost {
  const host = cleanHost(inputHost);

  const empty: TenantHost = {
    host,
    rootDomain: ROOT_DOMAIN,
    subdomain: null,
    requestedSubdomain: null,
    environmentKey: "production",
    isRootHost: false,
    isAppHost: false,
    isPlatformAdminHost: false,
    isTenantHost: false,
    isPreviewHost: false,
    isLocalHost: false,
    isCustomDomainHost: false,
  };

  if (!host) return empty;

  const isLocalHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host === "0.0.0.0";

  const isPreviewHost = host.endsWith(".vercel.app");

  if (isLocalHost || isPreviewHost) {
    return {
      ...empty,
      isLocalHost,
      isPreviewHost,
    };
  }

  const isRootHost = host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`;
  const isAppHost = host === `app.${ROOT_DOMAIN}`;
  const isPlatformAdminHost = host === `admin.${ROOT_DOMAIN}`;

  if (isRootHost || isAppHost || isPlatformAdminHost) {
    return {
      ...empty,
      isRootHost,
      isAppHost,
      isPlatformAdminHost,
    };
  }

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const rawSubdomain = host.slice(0, -`.${ROOT_DOMAIN}`.length).trim();
    const parsed = normalizeTenantEnvironmentSubdomain(rawSubdomain);

    return {
      ...empty,
      subdomain: parsed.subdomain,
      requestedSubdomain: parsed.requestedSubdomain,
      environmentKey: parsed.environmentKey,
      isTenantHost: Boolean(parsed.subdomain),
    };
  }

  return {
    ...empty,
    isCustomDomainHost: host.includes("."),
    isTenantHost: host.includes("."),
  };
}
