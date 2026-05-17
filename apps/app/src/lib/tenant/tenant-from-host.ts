// apps/app/src/lib/tenant/tenant-from-host.ts

export type TenantEnvironmentKey = "production" | "test" | "staging";

export type TenantHost = {
  host: string;
  rootDomain: string;

  /**
   * The real tenant subdomain used for DB lookups.
   * Example:
   *   test123-stg.hi5tech.co.uk -> test123
   */
  subdomain: string | null;

  /**
   * The actual subdomain requested in the browser.
   * Example:
   *   test123-stg.hi5tech.co.uk -> test123-stg
   */
  requestedSubdomain: string | null;

  /**
   * Environment resolved from the requested subdomain.
   */
  environmentKey: TenantEnvironmentKey;

  isRootHost: boolean;
  isAppHost: boolean;
  isPlatformAdminHost: boolean;
  isTenantHost: boolean;
};

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk").toLowerCase();

function cleanHost(inputHost: string | null | undefined) {
  return String(inputHost || "")
    .trim()
    .toLowerCase()
    .split(",")[0]
    .split(":")[0];
}

export function normalizeTenantEnvironmentSubdomain(rawSubdomain: string | null | undefined): {
  subdomain: string | null;
  requestedSubdomain: string | null;
  environmentKey: TenantEnvironmentKey;
} {
  const requestedSubdomain = String(rawSubdomain || "").trim().toLowerCase();

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
  const rootDomain = ROOT_DOMAIN;
  const host = cleanHost(inputHost);

  const empty: TenantHost = {
    host,
    rootDomain,
    subdomain: null,
    requestedSubdomain: null,
    environmentKey: "production",
    isRootHost: false,
    isAppHost: false,
    isPlatformAdminHost: false,
    isTenantHost: false,
  };

  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".vercel.app")) {
    return empty;
  }

  const isRootHost = host === rootDomain || host === `www.${rootDomain}`;
  const isAppHost = host === `app.${rootDomain}`;
  const isPlatformAdminHost = host === `admin.${rootDomain}`;

  if (isRootHost || isAppHost || isPlatformAdminHost) {
    return {
      ...empty,
      isRootHost,
      isAppHost,
      isPlatformAdminHost,
    };
  }

  if (!host.endsWith(`.${rootDomain}`)) {
    return empty;
  }

  const rawSubdomain = host.slice(0, -`.${rootDomain}`.length).trim();

  if (!rawSubdomain) {
    return empty;
  }

  const parsed = normalizeTenantEnvironmentSubdomain(rawSubdomain);

  return {
    host,
    rootDomain,
    subdomain: parsed.subdomain,
    requestedSubdomain: parsed.requestedSubdomain,
    environmentKey: parsed.environmentKey,
    isRootHost: false,
    isAppHost: false,
    isPlatformAdminHost: false,
    isTenantHost: Boolean(parsed.subdomain),
  };
}

export function getEffectiveHost(headers: Headers) {
  return (
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    headers.get("x-vercel-deployment-url") ||
    ""
  );
}
