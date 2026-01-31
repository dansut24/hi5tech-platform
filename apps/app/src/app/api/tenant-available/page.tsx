import Link from "next/link";
import { headers } from "next/headers";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "hi5tech.co.uk";
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || "https://hi5tech.co.uk";

function getRequestedSubdomain() {
  const h = headers();
  const host = (h.get("host") || "").split(":")[0].toLowerCase();

  if (!host.endsWith(ROOT_DOMAIN)) return null;
  if (host === ROOT_DOMAIN) return null;

  const sub = host.slice(0, -ROOT_DOMAIN.length - 1);
  if (!sub || sub === "www" || sub === "app") return null;

  return sub;
}

export default function TenantAvailablePage({
  searchParams,
}: {
  searchParams: { requested?: string; path?: string };
}) {
  const fromHost = getRequestedSubdomain();
  const requested = (searchParams?.requested || fromHost || "").toLowerCase();

  const signupUrl = new URL(MARKETING_URL);
  // Change this path to whatever your marketing signup route is
  signupUrl.pathname = "/signup";
  if (requested) signupUrl.searchParams.set("subdomain", requested);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-xl hi5-card p-6">
        <div className="text-sm opacity-70">Hi5Tech Platform</div>

        <h1 className="mt-2 text-2xl font-semibold">
          {requested ? (
            <>
              <span className="hi5-accent">{requested}</span>.{ROOT_DOMAIN} is available
            </>
          ) : (
            <>This workspace is available</>
          )}
        </h1>

        <p className="mt-2 text-sm opacity-80">
          This tenant doesn’t exist yet. Create it now and start a <b>14-day free trial</b>.
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
          If you expected this tenant to exist, double-check the spelling or ask your admin to create it.
        </div>
      </div>
    </div>
  );
}
