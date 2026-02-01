import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

const MODULES: Array<{
  key: ModuleKey;
  title: string;
  description: string;
  href: string;
  gradient: string; // used for subtle glow
  icon: React.ReactNode;
}> = [
  {
    key: "itsm",
    title: "ITSM",
    description: "Incidents, requests, changes, and service desk workflows.",
    href: "/itsm",
    gradient:
      "radial-gradient(700px 180px at 15% 0%, rgba(0,193,255,0.45), transparent 55%), radial-gradient(700px 180px at 85% 100%, rgba(255,79,225,0.35), transparent 55%)",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v16h10V4H7Zm2 3h6v2H9V7Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z"
        />
      </svg>
    ),
  },
  {
    key: "control",
    title: "Control",
    description: "Remote tools, device access, live actions, and inventory.",
    href: "/control",
    gradient:
      "radial-gradient(700px 180px at 10% 10%, rgba(255,196,45,0.40), transparent 55%), radial-gradient(700px 180px at 90% 90%, rgba(0,193,255,0.32), transparent 55%)",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4l2 3v1H8v-1l2-3H6a2 2 0 0 1-2-2V6Zm2 0v7h12V6H6Z"
        />
      </svg>
    ),
  },
  {
    key: "selfservice",
    title: "Self Service",
    description: "End-user portal for requests, updates, and knowledge base.",
    href: "/selfservice",
    gradient:
      "radial-gradient(700px 180px at 20% 0%, rgba(255,79,225,0.35), transparent 55%), radial-gradient(700px 180px at 80% 100%, rgba(255,196,45,0.32), transparent 55%)",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2a7 7 0 0 1 7 7c0 2.1-.9 3.9-2.3 5.2-.5.5-.7 1.2-.7 1.9V18a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1.9c0-.7-.2-1.4-.7-1.9A7.2 7.2 0 0 1 5 9a7 7 0 0 1 7-7Zm-2 17h4v-1h-4v1Zm.3-4h3.4c.2-1.2.8-2.2 1.6-3 1-1 1.7-2.3 1.7-4a5 5 0 0 0-10 0c0 1.7.7 3 1.7 4 .8.8 1.4 1.8 1.6 3Z"
        />
      </svg>
    ),
  },
  {
    key: "admin",
    title: "Admin",
    description: "Users, tenant settings, access control, and billing setup.",
    href: "/admin",
    gradient:
      "radial-gradient(700px 180px at 15% 0%, rgba(0,193,255,0.35), transparent 55%), radial-gradient(700px 180px at 85% 100%, rgba(255,79,225,0.32), transparent 55%)",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 1.5 20 6v6c0 5-3.4 9.4-8 10.5C7.4 21.4 4 17 4 12V6l8-4.5Zm0 2.3L6 6.6V12c0 4 2.6 7.5 6 8.4 3.4-.9 6-4.4 6-8.4V6.6l-6-2.8Zm-1 4.2h2v6h-2V8Zm0 7h2v2h-2v-2Z"
        />
      </svg>
    ),
  },
];

function initials(name?: string | null, email?: string | null) {
  const n = (name || "").trim();
  if (n) {
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }
  const e = (email || "").trim();
  return e ? e[0].toUpperCase() : "U";
}

export default async function ModulesPage() {
  const supabase = await supabaseServer();

  // Auth
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Tenant from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) notFound();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, plan, status, trial_ends_at")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) notFound();

  // My membership (tenant role)
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role, created_at")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = String(membership?.role || "user");

  // My profile (name/avatar if you store it)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name ?? "";
  const email = profile?.email ?? user.email ?? "";

  // Which modules are enabled for me?
  // NOTE: this expects module_assignments(membership_id, module)
  let enabled = new Set<ModuleKey>();
  if (membership?.id) {
    const { data: mods } = await supabase
      .from("module_assignments")
      .select("module")
      .eq("membership_id", membership.id);

    (mods ?? []).forEach((m: any) => {
      const k = String(m.module || "") as ModuleKey;
      if (k === "itsm" || k === "control" || k === "selfservice" || k === "admin") enabled.add(k);
    });
  }

  // If your “owner/admin” should always see Admin, enforce here:
  if (myRole === "owner" || myRole === "admin") enabled.add("admin");

  // Trial banner info
  let trialText: string | null = null;
  if (tenant?.status === "trial" && tenant?.trial_ends_at) {
    const end = new Date(tenant.trial_ends_at);
    const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    trialText = `Trial active • ${days} day${days === 1 ? "" : "s"} remaining`;
  }

  return (
    <div className="min-h-dvh">
      <div className="hi5-container py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl border hi5-border bg-white/50 dark:bg-black/30 backdrop-blur-md flex items-center justify-center font-bold">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                ) : (
                  <span>{initials(fullName, email)}</span>
                )}
              </div>
              <div
                className="absolute -inset-2 rounded-3xl opacity-50 blur-xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(0,193,255,0.55), transparent 60%)," +
                    "radial-gradient(circle at 70% 70%, rgba(255,79,225,0.45), transparent 60%)",
                }}
              />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-semibold leading-tight">
                Hi5Tech
              </h1>
              <p className="text-sm opacity-80">
                {fullName ? (
                  <>
                    {fullName} <span className="opacity-60">•</span>{" "}
                    <span className="opacity-80">{email}</span>
                  </>
                ) : (
                  email
                )}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border hi5-border px-2 py-1 bg-white/40 dark:bg-black/25">
                  Tenant: <span className="font-medium">{tenant.subdomain}</span>
                </span>
                <span className="rounded-full border hi5-border px-2 py-1 bg-white/40 dark:bg-black/25">
                  Role: <span className="font-medium">{myRole}</span>
                </span>
                {trialText ? (
                  <span className="rounded-full border hi5-border px-2 py-1 bg-white/40 dark:bg-black/25">
                    {trialText}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="hi5-btn-ghost text-sm"
            >
              Logout
            </button>
          </form>
        </div>

        {/* Subheader */}
        <div className="mt-6">
          <h2 className="text-sm uppercase tracking-wide opacity-70">Choose a module</h2>
        </div>

        {/* Cards */}
        <div className="mt-4 grid gap-4">
          {MODULES.map((m) => {
            const isEnabled = enabled.has(m.key);

            // ITSM card: show tenant role pill
            const rolePill =
              m.key === "itsm" ? (
                <span className="rounded-full border hi5-border px-2 py-1 text-xs bg-white/45 dark:bg-black/25">
                  Your role: <span className="font-semibold">{myRole}</span>
                </span>
              ) : null;

            return (
              <div
                key={m.key}
                className={[
                  "relative overflow-hidden rounded-3xl border hi5-border",
                  "bg-white/45 dark:bg-black/28 backdrop-blur-xl",
                  "shadow-[0_18px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.55)]",
                  isEnabled ? "opacity-100" : "opacity-60",
                ].join(" ")}
              >
                {/* internal glow */}
                <div
                  className="absolute inset-0 opacity-80 pointer-events-none"
                  style={{ background: m.gradient }}
                />

                {/* subtle highlight edge */}
                <div className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-35"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.30), rgba(255,255,255,0.00))",
                  }}
                />

                <div className="relative p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-2xl border hi5-border bg-white/55 dark:bg-black/30 backdrop-blur flex items-center justify-center">
                        {m.icon}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{m.title}</h3>
                          {rolePill}
                          {!isEnabled ? (
                            <span className="rounded-full border hi5-border px-2 py-1 text-xs bg-white/40 dark:bg-black/25">
                              Not enabled
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-sm opacity-80 leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                    </div>

                    {isEnabled ? (
                      <Link
                        href={m.href}
                        className="hi5-btn-primary text-sm"
                      >
                        Open
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="hi5-btn-ghost text-sm opacity-70"
                        disabled
                        title="Not enabled for your account"
                      >
                        Locked
                      </button>
                    )}
                  </div>

                  {/* Optional quick actions row (only show when enabled) */}
                  {isEnabled ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.key === "itsm" ? (
                        <>
                          <Link className="hi5-btn-ghost text-xs" href="/itsm">
                            Dashboard
                          </Link>
                          <Link className="hi5-btn-ghost text-xs" href="/itsm/incidents/new">
                            New incident
                          </Link>
                        </>
                      ) : null}

                      {m.key === "admin" ? (
                        <>
                          <Link className="hi5-btn-ghost text-xs" href="/admin/users">
                            Users
                          </Link>
                          <Link className="hi5-btn-ghost text-xs" href="/admin/settings">
                            Tenant settings
                          </Link>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-xs opacity-70">
                      Ask your tenant admin to enable this module for your account.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer help */}
        <div className="mt-8 text-center text-xs opacity-70">
          Need access changes? Contact your tenant admin.
        </div>
      </div>
    </div>
  );
}
