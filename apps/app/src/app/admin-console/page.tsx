import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin/guard";
import PlatformAdminShell from "@/components/platform-admin/platform-admin-shell";
import { formatGBP } from "@/lib/billing/pricing";

export const dynamic = "force-dynamic";

async function getCount(table: string) {
  const admin = supabaseAdmin();

  const { count } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });

  return count ?? 0;
}

async function getDashboardData() {
  const admin = supabaseAdmin();

  const [
    totalTenants,
    totalUsers,
    totalDevices,
    totalBillingChanges,
    trialTenants,
    activeTenants,
    billingProfiles,
    signupIntents,
  ] = await Promise.all([
    getCount("tenants"),
    getCount("memberships"),
    getCount("devices"),
    getCount("tenant_billing_changes"),
    admin.from("tenants").select("id", { count: "exact", head: true }).eq("status", "trial"),
    admin.from("tenants").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin
      .from("tenant_billing_profiles")
      .select("base_monthly_amount, per_technician_amount, per_device_amount")
      .in("billing_status", ["trial", "active"]),
    admin
      .from("tenant_signup_intents")
      .select("id, company_name, subdomain, admin_email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const estimatedBaseMrr =
    billingProfiles.data?.reduce((sum: number, row: any) => {
      return sum + Number(row.base_monthly_amount || 0);
    }, 0) ?? 0;

  return {
    totalTenants,
    totalUsers,
    totalDevices,
    totalBillingChanges,
    trialTenants: trialTenants.count ?? 0,
    activeTenants: activeTenants.count ?? 0,
    estimatedBaseMrr,
    signupIntents: signupIntents.data ?? [],
  };
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="hi5-card p-5">
      <div className="text-xs opacity-65">{label}</div>
      <div className="mt-1 text-3xl font-black">{value}</div>
      {sub ? <div className="mt-2 text-sm opacity-70">{sub}</div> : null}
    </div>
  );
}

export default async function PlatformAdminDashboardPage() {
  const adminContext = await requirePlatformAdmin();
  const data = await getDashboardData();

  return (
    <PlatformAdminShell admin={adminContext}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tenants" value={data.totalTenants} sub={`${data.trialTenants} trial · ${data.activeTenants} active`} />
          <StatCard label="Users" value={data.totalUsers} sub="Membership records across all tenants" />
          <StatCard label="Devices" value={data.totalDevices} sub="Enrolled Control devices" />
          <StatCard label="Base MRR estimate" value={formatGBP(data.estimatedBaseMrr)} sub="Base plan fees only, excluding usage" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="hi5-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">Recent signup intents</div>
                <p className="mt-1 text-sm opacity-75">
                  Latest tenant signup attempts and onboarding states.
                </p>
              </div>

              <Link href="/admin-console/tenants" className="hi5-btn-ghost w-auto text-sm">
                View tenants
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {data.signupIntents.length ? (
                data.signupIntents.map((intent: any) => (
                  <div
                    key={intent.id}
                    className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-bold">{intent.company_name}</div>
                        <div className="mt-1 text-sm opacity-70">
                          {intent.subdomain}.hi5tech.co.uk · {intent.admin_email}
                        </div>
                      </div>

                      <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-xs font-bold dark:bg-white/5">
                        {intent.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border hi5-border bg-black/5 p-4 text-sm opacity-70 dark:bg-white/5">
                  No signup intents yet.
                </div>
              )}
            </div>
          </div>

          <div className="hi5-panel p-5">
            <div className="text-lg font-extrabold">Next platform-admin passes</div>
            <div className="mt-4 space-y-3 text-sm leading-6 opacity-75">
              <p>1. Lock access to platform_admin_users.</p>
              <p>2. Enforce MFA before loading the console.</p>
              <p>3. Add tenant feature editing.</p>
              <p>4. Add billing change approve/apply/cancel.</p>
              <p>5. Add audit logging for every write action.</p>
            </div>
          </div>
        </div>
      </div>
    </PlatformAdminShell>
  );
}
