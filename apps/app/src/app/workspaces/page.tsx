import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildTenantEnvironmentUrls } from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function WorkspaceCard({
  tenant,
  role,
}: {
  tenant: any;
  role: string;
}) {
  const tenantName = tenant.company_name || tenant.name || tenant.subdomain || "Workspace";

  const urls = buildTenantEnvironmentUrls({
    subdomain: tenant.subdomain,
    rootDomain: tenant.domain || "hi5tech.co.uk",
  });

  return (
    <div className="hi5-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] opacity-60">
            Workspace
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight">
            {tenantName}
          </h2>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border hi5-border bg-black/5 px-2.5 py-1 font-bold dark:bg-white/5">
              {tenant.subdomain}.hi5tech.co.uk
            </span>

            <span className="rounded-full border hi5-border bg-black/5 px-2.5 py-1 font-bold dark:bg-white/5">
              Role: {role}
            </span>

            <span className="rounded-full border hi5-border bg-black/5 px-2.5 py-1 font-bold dark:bg-white/5">
              Status: {tenant.status || "unknown"}
            </span>

            {tenant.trial_ends_at ? (
              <span className="rounded-full border hi5-border bg-black/5 px-2.5 py-1 font-bold dark:bg-white/5">
                Trial ends: {formatDate(tenant.trial_ends_at)}
              </span>
            ) : null}
          </div>
        </div>

        <a href={urls.production} className="hi5-btn-primary w-auto text-sm">
          Open production
        </a>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <a
          href={urls.production}
          className="rounded-2xl border hi5-border bg-black/5 p-4 transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="text-xs opacity-65">Production</div>
          <div className="mt-1 break-words text-sm font-bold">{urls.production}</div>
          <div className="mt-2 text-xs opacity-65">
            Live customer environment.
          </div>
        </a>

        <a
          href={urls.test}
          className="rounded-2xl border hi5-border bg-black/5 p-4 transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="text-xs opacity-65">Test</div>
          <div className="mt-1 break-words text-sm font-bold">{urls.test}</div>
          <div className="mt-2 text-xs opacity-65">
            Resettable testing environment.
          </div>
        </a>

        <a
          href={urls.staging}
          className="rounded-2xl border hi5-border bg-black/5 p-4 transition hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="text-xs opacity-65">Staging</div>
          <div className="mt-1 break-words text-sm font-bold">{urls.staging}</div>
          <div className="mt-2 text-xs opacity-65">
            Review changes before production.
          </div>
        </a>
      </div>
    </div>
  );
}

export default async function WorkspacesPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/login");
  }

  const admin = supabaseAdmin();

  const { data: memberships } = await admin
    .from("memberships")
    .select("tenant_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const tenantIds = Array.from(
    new Set((memberships ?? []).map((membership: any) => membership.tenant_id).filter(Boolean))
  );

  const { data: tenants } = tenantIds.length
    ? await admin
        .from("tenants")
        .select("id, name, company_name, domain, subdomain, status, plan, trial_ends_at, created_at")
        .in("id", tenantIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const roleByTenant = new Map<string, string>();

  for (const membership of memberships ?? []) {
    roleByTenant.set(membership.tenant_id, membership.role || "user");
  }

  if ((tenants ?? []).length === 1) {
    const tenant = tenants![0];
    const urls = buildTenantEnvironmentUrls({
      subdomain: tenant.subdomain,
      rootDomain: tenant.domain || "hi5tech.co.uk",
    });

    redirect(urls.production);
  }

  return (
    <div className="hi5-page">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="hi5-panel p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] opacity-60">
                Hi5Tech
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Choose a workspace
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 opacity-75">
                Select the tenant workspace you want to open. Production, Test and Staging are separated by URL.
              </p>
            </div>

            <form action="/auth/signout" method="post">
              <button type="submit" className="hi5-btn-ghost w-auto text-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {(tenants ?? []).length ? (
            tenants!.map((tenant: any) => (
              <WorkspaceCard
                key={tenant.id}
                tenant={tenant}
                role={roleByTenant.get(tenant.id) || "user"}
              />
            ))
          ) : (
            <div className="hi5-card p-5">
              <div className="text-lg font-extrabold">No workspaces found</div>
              <p className="mt-2 text-sm opacity-75">
                Your account is signed in, but it is not currently a member of any tenant workspace.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/login" className="hi5-btn-ghost w-auto text-sm">
                  Back to login
                </Link>

                <a href="https://hi5tech.co.uk/signup" className="hi5-btn-primary w-auto text-sm">
                  Create workspace
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
