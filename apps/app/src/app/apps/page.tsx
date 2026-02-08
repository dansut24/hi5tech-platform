// apps/app/src/app/apps/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getEffectiveHost, parseTenantHost } from "@/lib/tenant/tenant-from-host";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ModuleKey = "itsm" | "control" | "selfservice" | "admin";

const ALL: ModuleKey[] = ["itsm", "control", "selfservice", "admin"];

const MODULE_PATH: Record<ModuleKey, string> = {
  itsm: "/itsm",
  control: "/control",
  selfservice: "/selfservice",
  admin: "/admin",
};

export default async function AppsLandingPage() {
  // 🔥 ensures Next never caches this render
  noStore();

  const supabase = await supabaseServer();

  // Must be logged in
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) redirect("/login");

  // Identify tenant from host
  const host = getEffectiveHost(await headers());
  const parsed = parseTenantHost(host);
  if (!parsed.subdomain) redirect("/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, domain, subdomain, is_active")
    .eq("domain", parsed.rootDomain)
    .eq("subdomain", parsed.subdomain)
    .maybeSingle();

  if (!tenant || tenant.is_active === false) redirect("/login");

  const tenantId = tenant.id;

  // 🔒 HARD GATE: onboarding must be complete
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("onboarding_completed")
    .eq("tenant_id", tenantId)
    .single();

  if (!settings?.onboarding_completed) {
    redirect("/admin/setup");
  }

  // memberships -> module assignments (scoped to THIS tenant)
  const { data: memberships, error: mErr } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, created_at")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (mErr) {
    return (
      <div className="min-h-dvh p-6">
        <h1 className="text-2xl font-semibold">Apps</h1>
        <p className="mt-2 text-sm text-red-600">{mErr.message}</p>
        <form action={logoutAction} className="mt-6">
          <button className="rounded-xl border hi5-border px-4 py-2 text-sm">
            Logout
          </button>
        </form>
      </div>
    );
  }

  const membershipIds = (memberships ?? []).map((m) => m.id);

  let modules: ModuleKey[] = [];
  if (membershipIds.length) {
    const { data: rows } = await supabase
      .from("module_assignments")
      .select("membership_id, module")
      .in("membership_id", membershipIds);

    const allowed = new Set<ModuleKey>();
    for (const r of rows ?? []) {
      const mod = r.module as ModuleKey;
      if (ALL.includes(mod)) allowed.add(mod);
    }
    modules = Array.from(allowed);
  }

  const buildStamp =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    "local";

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hi5Tech</h1>
          <p className="mt-1 text-sm opacity-80">Choose a module</p>

          {/* ✅ TEMP DEBUG STAMP */}
          <p className="mt-2 text-xs opacity-60">Build: {buildStamp}</p>
        </div>

        <form action={logoutAction}>
          <button className="rounded-xl border hi5-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition">
            Logout
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(modules.length ? modules : ALL).map((m) => (
          <Link
            key={m}
            href={MODULE_PATH[m]}
            className="rounded-2xl border hi5-border p-5 hi5-card hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <div className="text-lg font-semibold">{m.toUpperCase()}</div>
            <div className="text-sm opacity-80 mt-1">Open {m} module</div>
          </Link>
        ))}
      </div>

      {!modules.length ? (
        <div className="mt-6 text-sm opacity-70">
          No module assignments found yet. Ask an admin to assign modules for your membership.
        </div>
      ) : null}
    </div>
  );
}
