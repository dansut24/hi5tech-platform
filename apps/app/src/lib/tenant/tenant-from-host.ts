// apps/app/src/lib/tenant/tenant-from-host.ts

export type TenantHost = {
  host: string;
  rootDomain: string;
  subdomain: string | null;
};

export function parseTenantHost(inputHost: string | null | undefined): TenantHost {
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk").toLowerCase();

  const host = String(inputHost || "")
    .trim()
    .toLowerCase()
    .split(",")[0] // sometimes proxies append
    .split(":")[0];

  // local/preview: treat as no-tenant
  if (!host || host === "localhost" || host.endsWith(".vercel.app")) {
    return { host, rootDomain, subdomain: null };
  }

  if (!host.endsWith(rootDomain)) {
    return { host, rootDomain, subdomain: null };
  }

  if (host === rootDomain) {
    return { host, rootDomain, subdomain: null };
  }

  const sub = host.slice(0, -rootDomain.length - 1); // remove ".root"
  if (!sub) return { host, rootDomain, subdomain: null };

  // ignore non-tenant app/www
  if (sub === "www" || sub === "app") return { host, rootDomain, subdomain: null };

  return { host, rootDomain, subdomain: sub };
}

export function getEffectiveHost(headers: Headers) {
  return (
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    headers.get("x-vercel-deployment-url") ||
    ""
  );
}
