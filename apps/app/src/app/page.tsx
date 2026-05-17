import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import {
  getTenantBillingProfile,
  getTenantFeatureMap,
} from "@/lib/billing/tenant-billing";
import TrialBanner from "@/components/billing/trial-banner";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

const MODULES: Array<{
  key: ModuleKey;
  title: string;
  description: string;
  href: string;
  gradient: string;
  icon: React.ReactNode;
}> = [
  {
    key: "itsm",
    title: "ITSM",
    description: "Incidents, requests, changes, and service desk workflows.",
    href: "/itsm",
    gradient:
      "radial-gradient(700px 220px at 15% 0%, rgba(var(--hi5-accent),0.28), transparent 58%), radial-gradient(700px 220px at 85% 100%, rgba(var(--hi5-accent-2),0.20), transparent 58%)",
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
    href: "/control/devices",
    gradient:
      "radial-gradient(700px 220px at 10% 10%, rgba(var(--hi5-accent-3),0.24), transparent 58%), radial-gradient(700px 220px at 90% 90%, rgba(var(--hi5-accent),0.22), transparent 58%)",
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
      "radial-gradient(700px 220px at 20% 0%, rgba(var(--hi5-accent-2),0.18), transparent 58%), radial-gradient(700px 220px at 80% 100%, rgba(var(--hi5-accent-3),0.18), transparent 58%)",
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
    description: "Users, tenant settings, access control, billing and upgrades.",
    href: "/admin",
    gradient:
      "radial-gradient(700px 220px at 15% 0%, rgba(var(--hi5-accent),0.20), transparent 58%), radial-gradient(700px 220px at 85% 100%, rgba(var(--hi5-accent-2),0.16), transparent 58%)",
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

function ModuleTile({
  module,
  myRole,
}: {
  module: (typeof MODULES)[number];
  myRole: string;
}) {
  const rolePill =
    module.key === "itsm" ? (
      <span className="rounded-full border hi5-border px-2 py-1 text-[11px] bg-white/45 dark:bg-black/25">
        Your role: <span className="font-semibold">{myRole}</span>
      </span>
    ) : null;

  return (
    <div className="hi5-card group min-h-[260px] sm:min-h-[280px] p-0 flex flex-col">
      <div
        className="absolute inset-0 opacity-80 pointer-events-none"
        style={{ background: module.gradient }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-35"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.30), rgba(255,255,255,0.00))",
        }}
      />

      <div className="relative z-10 flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl border hi5-border bg-white/55 dark:bg-black/30 backdrop-blur flex items-center justify-center">
            {module.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-extrabold leading-tight">
                {module.title}
              </h3>
              {rolePill}
            </div>

            <p className="mt-2 text-sm opacity-80 leading-relaxed">
              {module.description}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="mt-5 flex flex-col gap-3">
          {module.key === "itsm" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link className="hi5-btn-ghost text-xs text-center" href="/itsm">
                Dashboard
              </Link>
              <Link className="hi5-btn-ghost text-xs text-center" href="/itsm/incidents/new">
                New incident
              </Link>
            </div>
          ) : null}

          {module.key === "control" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link className="hi5-btn-ghost text-xs text-center" href="/control/devices">
                Devices
              </Link>
              <Link className="hi5-btn-ghost text-xs text-center" href="/control/devices">
                Remote tools
              </Link>
            </div>
          ) : null}

          {module.key === "admin" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link className="hi5-btn-ghost text-xs text-center" href="/admin/users">
                Users
              </Link>
              <Link className="hi5-btn-ghost text-xs text-center" href="/admin/billing">
                Billing
              </Link>
            </div>
          ) : null}

          <Link href={module.href} className="hi5-btn-primary text-sm text-center">
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}

function UpgradeHint({
  hasItsm,
  hasControl,
}: {
  hasItsm: boolean;
  hasControl: boolean;
}) {
  if (hasItsm && hasControl) return null;

  return (
    <div className="hi5-card p-5">
      <div className="text-sm font-extrabold">Want to add more modules?</div>
      <p className="mt-1 text-sm opacity-75">
        Products not included in your current plan are hidden from this Apps page. Workspace owners can add
        modules from Admin → Billing.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {!hasItsm ? (
          <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-xs font-bold dark:bg-white/5">
            ITSM available as upgrade
          </span>
        ) : null}

        {!hasControl ? (
          <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-xs font-bold dark:bg-white/5">
            Control available as upgrade
          </span>
        ) : null}

        <Link href="/admin/billing" className="hi5-btn-primary w-auto text-sm">
          View billing
        </Link>
      </div>
    </div>
  );
}

export default async function ModulesPage() {
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);

  if (parsed.subdomain === "admin") {
    redirect("/admin-console");
  }

  if (!parsed.subdomain) notFound();

  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, domain, subdomain, name, plan, status, trial_ends_at")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant) notFound();

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role, created_at")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.id) {
    redirect("/login");
  }

  const myRole = String(membership.role || "user");
  const isOwner = myRole === "owner";
  const isBillingAdmin = myRole === "billing_admin";
  const canViewBilling = isOwner || isBillingAdmin;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profile?.full_name ?? "";
  const email = profile?.email ?? user.email ?? "";

  const [features, billingResult] = await Promise.all([
    getTenantFeatureMap(tenant.id),
    getTenantBillingProfile(tenant.id),
  ]);

  const hasItsm = features.itsm_core === true;

  const hasControl =
    features.devices_inventory === true ||
    features.devices_reporting === true ||
    features.remote_control === true ||
    features.remote_terminal === true ||
    features.remote_files === true ||
    features.scripts === true ||
    features.monitoring === true;

  const enabled = new Set<ModuleKey>();

  if (hasItsm) {
    enabled.add("itsm");
    enabled.add("selfservice");
  }

  if (hasControl) {
    enabled.add("control");
  }

  if (myRole === "owner" || myRole === "admin" || myRole === "billing_admin") {
    enabled.add("admin");
  }

  const visibleModules = MODULES.filter((module) => enabled.has(module.key));

  const planLabel = billingResult?.plan?.label ?? "Trial";
  const billing = billingResult?.billing ?? null;

  let trialText: string | null = null;

  if (billing?.billing_status === "trial" && billing?.trial_ends_at) {
    const end = new Date(billing.trial_ends_at);
    const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    trialText = `Trial active • ${days} day${days === 1 ? "" : "s"} remaining`;
  } else if (tenant?.status === "trial" && tenant?.trial_ends_at) {
    const end = new Date(tenant.trial_ends_at);
    const days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    trialText = `Trial active • ${days} day${days === 1 ? "" : "s"} remaining`;
  }

  return (
    <div className="hi5-page">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className="grid grid-cols-1 gap-5 lg:gap-7 2xl:grid-cols-[360px_1fr]">
          <div className="space-y-5">
            <div className="hi5-panel p-5 sm:p-6">
              <div
                className="absolute inset-0 opacity-70 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(900px 260px at 20% 0%, rgba(var(--hi5-accent),0.18), transparent 60%)," +
                    "radial-gradient(900px 260px at 80% 100%, rgba(var(--hi5-accent-2),0.14), transparent 60%)",
                }}
              />

              <div className="relative z-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between 2xl:flex-col 2xl:justify-start">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-2xl border hi5-border bg-white/50 dark:bg-black/30 backdrop-blur-md flex items-center justify-center font-bold">
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

                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">
                        Hi5Tech
                      </h1>
                      <p className="text-sm opacity-80 break-words">
                        {fullName ? (
                          <>
                            {fullName} <span className="opacity-60">•</span>{" "}
                            <span className="opacity-80">{email}</span>
                          </>
                        ) : (
                          email
                        )}
                      </p>
                    </div>
                  </div>

                  <form action="/auth/signout" method="post" className="shrink-0">
                    <button type="submit" className="hi5-btn-ghost text-sm">
                      Logout
                    </button>
                  </form>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border hi5-border px-2 py-1 bg-white/40 dark:bg-black/25">
                    Tenant: <span className="font-medium">{tenant.subdomain}</span>
                  </span>

                  <span className="rounded-full border hi5-border px-2 py-1 bg-white/40 dark:bg-black/25">
                    Role: <span className="font-medium">{myRole}</span>
                  </span>

                  <span className="rounded-full border hi5-border px-2 py-1 bg-white/40 dark:bg-black/25">
                    Plan: <span className="font-medium">{planLabel}</span>
                  </span>

                  {trialText ? (
                    <span className="rounded-full border hi5-border px-2 py-1 bg-white/40 dark:bg-black/25">
                      {trialText}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <h2 className="text-sm uppercase tracking-wide opacity-70">
                    Choose a module
                  </h2>
                  <p className="mt-1 text-sm opacity-75 leading-relaxed max-w-2xl 2xl:max-w-none">
                    Only modules included in your current plan are shown here.
                  </p>
                </div>

                <div className="mt-5 text-xs opacity-70">
                  Need access changes? Contact your tenant admin.
                </div>
              </div>
            </div>

            {canViewBilling && billing ? (
              <TrialBanner
                planLabel={billingResult.plan.label}
                planKey={billingResult.plan.key}
                daysRemaining={billingResult.daysRemaining}
                trialEndsAt={billing.trial_ends_at}
                baseMonthly={Number(billing.base_monthly_amount)}
                perTechnician={Number(billing.per_technician_amount)}
                perDevice={Number(billing.per_device_amount)}
              />
            ) : null}

            {canViewBilling ? (
              <UpgradeHint hasItsm={hasItsm} hasControl={hasControl} />
            ) : null}
          </div>

          <div className="min-w-0">
            {visibleModules.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {visibleModules.map((module) => (
                  <ModuleTile
                    key={module.key}
                    module={module}
                    myRole={myRole}
                  />
                ))}
              </div>
            ) : (
              <div className="hi5-panel p-5">
                <div className="text-lg font-extrabold">No modules available</div>
                <p className="mt-2 text-sm opacity-75">
                  Your account is active, but no application modules are currently enabled for this
                  workspace or your role.
                </p>

                {canViewBilling ? (
                  <div className="mt-4">
                    <Link href="/admin/billing" className="hi5-btn-primary w-auto text-sm">
                      View billing and upgrades
                    </Link>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
