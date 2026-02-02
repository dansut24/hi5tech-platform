// apps/app/src/app/(modules)/selfservice/ui/selfservice-shell.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

function initials(email?: string | null) {
  const base = String(email || "?").split("@")[0] || "?";
  const parts = base.split(/[._-]+/g).filter(Boolean);
  const a = (parts[0]?.[0] || base[0] || "?").toUpperCase();
  const b = (parts[1]?.[0] || base[1] || "").toUpperCase();
  return (a + b).slice(0, 2);
}

export default async function SelfServiceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  const tenantLabel = parsed.subdomain ? parsed.subdomain : "Hi5Tech";
  const tenantHost =
    parsed.subdomain && parsed.rootDomain
      ? `${parsed.subdomain}.${parsed.rootDomain}`
      : host;

  // Note: we can wire user profile/avatar later via supabaseServer() if you want.
  const demoEmail = "user@tenant.com";

  return (
    <div className="min-h-dvh">
      <div className="hi5-bg">
        {/* Top bar */}
        <header className="sticky top-0 z-30 px-4 sm:px-6 py-4">
          <div className="hi5-topbar rounded-3xl px-4 py-3 flex items-center gap-3">
            {/* Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-10 w-10 rounded-2xl shrink-0"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(255,79,225,.85), rgba(0,193,255,.75) 55%, rgba(255,196,45,.65))",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
                }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs opacity-70">Self Service</div>
                <div className="text-sm font-semibold truncate">
                  {tenantLabel} • {tenantHost}
                </div>
              </div>
            </div>

            {/* Search (GET form so it works server-side) */}
            <div className="flex-1 max-w-xl hidden md:block">
              <form action="/selfservice/search" method="GET">
                <input
                  name="q"
                  className="hi5-input"
                  placeholder="Search knowledge base, incidents, requests…"
                  aria-label="Search"
                />
              </form>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-2">
              <Link href="/selfservice" className="hi5-btn-ghost text-sm">
                Home
              </Link>
              <Link href="/selfservice/incident/new" className="hi5-btn-ghost text-sm">
                Raise incident
              </Link>
              <Link href="/selfservice/request/new" className="hi5-btn-primary text-sm">
                Raise request
              </Link>

              {/* Profile */}
              <Link
                href="/selfservice/profile"
                className="hidden sm:flex items-center gap-2 rounded-2xl border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
                title="Profile"
              >
                <div className="h-8 w-8 rounded-xl hi5-card flex items-center justify-center font-bold">
                  {initials(demoEmail)}
                </div>
                <span className="opacity-80">Profile</span>
              </Link>
            </nav>
          </div>

          {/* Mobile search */}
          <div className="mt-3 md:hidden">
            <form action="/selfservice/search" method="GET">
              <input
                name="q"
                className="hi5-input"
                placeholder="Search…"
                aria-label="Search"
              />
            </form>
          </div>
        </header>

        {/* Page */}
        <main className="px-4 sm:px-6 pb-10">{children}</main>
      </div>
    </div>
  );
}
