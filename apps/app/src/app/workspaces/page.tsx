// apps/app/src/app/workspaces/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { buildTenantEnvironmentUrls } from "@/lib/tenant/environment-host";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function initials(name?: string | null, fallback?: string | null) {
  const clean = String(name || "").trim();

  if (clean) {
    return clean
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  const f = String(fallback || "").trim();
  return f ? f[0].toUpperCase() : "H";
}

async function loadWorkspaces(userId: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      id,
      role,
      created_at,
      tenant:tenants (
        id,
        name,
        company_name,
        domain,
        subdomain,
        status,
        plan,
        trial_ends_at,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).filter((row: any) => row.tenant?.id);
}

export default async function WorkspacesPage() {
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  if (!user) {
    redirect("/login");
  }

  const [workspacesResult, profileResult] = await Promise.all([
    loadWorkspaces(user.id),
    supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const workspaces = workspacesResult;
  const profile = profileResult.data;

  const displayName = profile?.full_name || user.email || "User";
  const email = profile?.email || user.email || "";

  return (
    <main className="hi5-page min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1180px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/workspaces" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgb(var(--hi5-accent)/0.14)] text-sm font-black hi5-accent">
              H5
            </div>

            <div>
              <div className="text-xl font-black tracking-tight">Hi5Tech</div>
              <div className="text-xs opacity-65">Workspace selector</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold">{displayName}</div>
              <div className="text-xs opacity-65">{email}</div>
            </div>

            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border hi5-border bg-black/5 font-black dark:bg-white/5">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(displayName, email)
              )}
            </div>

            <form action="/auth/signout" method="post">
              <button type="submit" className="hi5-btn-ghost w-auto text-sm">
                Logout
              </button>
            </form>
          </div>
        </header>

        <section className="mt-10 hi5-panel overflow-hidden p-5 sm:p-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(900px 320px at 10% 0%, rgb(var(--hi5-accent) / 0.18), transparent 62%)," +
                "radial-gradient(900px 320px at 90% 100%, rgb(var(--hi5-accent-2) / 0.14), transparent 62%)",
            }}
          />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] hi5-accent">
                Workspaces
              </div>

              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                Choose where you want to work.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 opacity-75 sm:text-base">
                Access your tenant workspaces, including production, test and
                staging environments where available.
              </p>
            </div>

            <Link href="/signup" className="hi5-btn-primary w-auto text-sm">
              Create workspace
            </Link>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4">
          {workspaces.map((membership: any) => {
            const tenant = membership.tenant;
            const tenantName =
              tenant.company_name || tenant.name || tenant.subdomain || "Workspace";

            const urls = buildTenantEnvironmentUrls({
              subdomain: tenant.subdomain,
              rootDomain: tenant.domain || "hi5tech.co.uk",
            });

            return (
              <article
                key={membership.id}
                className="hi5-card overflow-hidden p-0"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto]">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl border hi5-border bg-black/5 text-lg font-black dark:bg-white/5">
                        {initials(tenantName, tenant.subdomain)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-black tracking-tight">
                            {tenantName}
                          </h2>

                          <span className="rounded-full border hi5-border bg-black/5 px-2.5 py-1 text-xs font-bold dark:bg-white/5">
                            {tenant.status || "active"}
                          </span>

                          <span className="rounded-full border hi5-border bg-black/5 px-2.5 py-1 text-xs font-bold dark:bg-white/5">
                            {membership.role || "member"}
                          </span>
                        </div>

                        <p className="mt-2 break-words text-sm opacity-70">
                          {tenant.subdomain}.{tenant.domain || "hi5tech.co.uk"}
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border hi5-border bg-black/5 p-3 dark:bg-white/5">
                            <div className="text-xs opacity-60">Plan</div>
                            <div className="mt-1 text-sm font-bold">
                              {tenant.plan || "Trial"}
                            </div>
                          </div>

                          <div className="rounded-2xl border hi5-border bg-black/5 p-3 dark:bg-white/5">
                            <div className="text-xs opacity-60">Trial ends</div>
                            <div className="mt-1 text-sm font-bold">
                              {formatDate(tenant.trial_ends_at)}
                            </div>
                          </div>

                          <div className="rounded-2xl border hi5-border bg-black/5 p-3 dark:bg-white/5">
                            <div className="text-xs opacity-60">Member since</div>
                            <div className="mt-1 text-sm font-bold">
                              {formatDate(membership.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t hi5-border p-5 sm:flex-row lg:min-w-[330px] lg:flex-col lg:border-l lg:border-t-0">
                    <a
                      href={urls.production}
                      className="hi5-btn-primary text-sm"
                    >
                      Open production
                    </a>

                    <a href={urls.test} className="hi5-btn-ghost text-sm">
                      Open test
                    </a>

                    <a href={urls.staging} className="hi5-btn-ghost text-sm">
                      Open staging
                    </a>
                  </div>
                </div>
              </article>
            );
          })}

          {!workspaces.length ? (
            <div className="hi5-card p-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl border hi5-border bg-black/5 font-black dark:bg-white/5">
                H5
              </div>

              <h2 className="mt-4 text-2xl font-black tracking-tight">
                No workspaces yet
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 opacity-75">
                You are signed in, but your account is not currently a member of
                any tenant workspace.
              </p>

              <div className="mt-5 flex justify-center">
                <Link href="/signup" className="hi5-btn-primary w-auto text-sm">
                  Create workspace
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
