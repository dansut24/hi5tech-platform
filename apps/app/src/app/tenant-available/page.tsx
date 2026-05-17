import Link from "next/link";
import { headers } from "next/headers";
import { normalizeTenantEnvironmentSubdomain } from "@/lib/tenant/tenant-from-host";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";
const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL || "https://hi5tech.co.uk";

async function getRequestedSubdomain() {
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0].toLowerCase();

  if (!host.endsWith(ROOT_DOMAIN)) return null;
  if (host === ROOT_DOMAIN) return null;

  const sub = host.slice(0, -ROOT_DOMAIN.length - 1);
  if (!sub || sub === "www" || sub === "app" || sub === "admin") return null;

  return sub;
}

export default async function TenantAvailablePage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string; path?: string }>;
}) {
  const params = await searchParams;

  const fromHost = await getRequestedSubdomain();
  const requestedRaw = String(params?.requested || fromHost || "").toLowerCase();

  const parsedRequested = normalizeTenantEnvironmentSubdomain(requestedRaw);
  const signupSubdomain = parsedRequested.subdomain || requestedRaw;

  const signupUrl = new URL(MARKETING_URL);
  signupUrl.pathname = "/signup";

  if (signupSubdomain) {
    signupUrl.searchParams.set("subdomain", signupSubdomain);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-xl hi5-card p-6">
        <div className="text-sm opacity-70">Hi5Tech Platform</div>

        <h1 className="mt-2 text-2xl font-semibold">
          {requestedRaw ? (
            <>
              <span className="hi5-accent">{requestedRaw}</span>.{ROOT_DOMAIN} is
              available
            </>
          ) : (
            <>This workspace is available</>
          )}
        </h1>

        {parsedRequested.environmentKey !== "production" && parsedRequested.subdomain ? (
          <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100">
            This looks like an environment URL for{" "}
            <b>{parsedRequested.subdomain}.{ROOT_DOMAIN}</b>. If that tenant exists,
            contact your admin. If it does not exist, create the base tenant first.
          </div>
        ) : null}

        <p className="mt-3 text-sm opacity-80">
          This tenant doesn’t exist yet. Create it now and start a{" "}
          <b>14-day free trial</b>.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href={signupUrl.toString()}
            className="hi5-accent-btn inline-flex items-center justify-center rounded-xl px-4 h-11 font-medium"
          >
            Start 14-day free trial
          </a>

          <Link
            href={MARKETING_URL}
            className="inline-flex items-center justify-center rounded-xl border hi5-border px-4 h-11 font-medium hover:bg-black/5 dark:hover:bg-white/5"
          >
            Back to website
          </Link>
        </div>

        <div className="mt-6 text-xs opacity-60">
          If you expected this tenant to exist, double-check the spelling or ask
          your admin to create it.
        </div>
      </div>
    </div>
  );
}
