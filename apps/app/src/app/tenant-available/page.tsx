// apps/app/src/app/tenant-available/page.tsx
import Link from "next/link";
import { getTenantEnvironmentHost } from "@/lib/tenant/environment-host";
import { normalizeTenantEnvironmentSubdomain } from "@/lib/tenant/tenant-from-host";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";
const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL || "https://hi5tech.co.uk";

export default async function TenantAvailablePage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string; path?: string }>;
}) {
  const params = await searchParams;
  const hostInfo = await getTenantEnvironmentHost();

  const requestedRaw = String(
    params?.requested ||
      hostInfo.requestedSubdomain ||
      hostInfo.hostSubdomain ||
      ""
  )
    .trim()
    .toLowerCase();

  const parsedRequested = normalizeTenantEnvironmentSubdomain(requestedRaw);
  const signupSubdomain = parsedRequested.subdomain || requestedRaw;

  const signupUrl = new URL(MARKETING_URL);
  signupUrl.pathname = "/signup";

  if (signupSubdomain) {
    signupUrl.searchParams.set("subdomain", signupSubdomain);
  }

  const displayWorkspace = requestedRaw
    ? `${requestedRaw}.${ROOT_DOMAIN}`
    : "this workspace";

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-xl hi5-card p-6">
        <div className="text-sm opacity-70">Hi5Tech Platform</div>

        <h1 className="mt-2 text-2xl font-semibold">
          <span className="hi5-accent">{displayWorkspace}</span> is available
        </h1>

        {parsedRequested.environmentKey !== "production" && parsedRequested.subdomain ? (
          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100">
            This looks like an environment URL for{" "}
            <b>
              {parsedRequested.subdomain}.{ROOT_DOMAIN}
            </b>
            . Create the base production tenant first, then the test/staging URLs
            will resolve automatically.
          </div>
        ) : null}

        <p className="mt-4 text-sm opacity-80">
          This tenant doesn’t exist yet. Create it now and start a{" "}
          <b>14-day free trial</b>.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={signupUrl.toString()}
            className="hi5-accent-btn inline-flex h-11 items-center justify-center rounded-xl px-4 font-medium"
          >
            Start 14-day free trial
          </a>

          <Link
            href={MARKETING_URL}
            className="inline-flex h-11 items-center justify-center rounded-xl border hi5-border px-4 font-medium hover:bg-black/5 dark:hover:bg-white/5"
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
