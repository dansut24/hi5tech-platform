import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin/guard";
import PlatformAdminShell from "@/components/platform-admin/platform-admin-shell";
import { formatGBP } from "@/lib/billing/pricing";

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

async function loadTenants() {
  const admin = supabaseAdmin();

  const { data: tenants } = await admin
    .from("tenants")
    .select("id, name, company_name, domain, subdomain, status, plan, onboarding_product, trial_ends_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const tenantIds = (tenants ?? []).map((tenant: any) => tenant.id);

  const { data: billing } = tenantIds.length
    ? await admin
        .from("tenant_billing_profiles")
        .select("tenant_id, plan_key, billing_status, trial_ends_at, base_monthly_amount")
        .in("tenant_id", tenantIds)
    : { data: [] };

  const billingByTenant = new Map<string, any>();

  for (const row of billing ?? []) {
    billingByTenant.set(row.tenant_id, row);
  }

  return (tenants ?? []).map((tenant: any) => ({
    ...tenant,
    billing: billingByTenant.get(tenant.id) ?? null,
  }));
}

export default async function PlatformTenantsPage() {
  const adminContext = await requirePlatformAdmin();
  const tenants = await loadTenants();

  return (
    <PlatformAdminShell admin={adminContext}>
      <div className="space-y-5">
        <div className="hi5-panel p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] opacity-60">
                Platform Admin
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Tenants</h2>
              <p className="mt-2 text-sm opacity-75">
                View all customer workspaces, plans, trial status and billing state.
              </p>
            </div>

            <div className="rounded-full border hi5-border bg-black/5 px-3 py-2 text-sm font-bold dark:bg-white/5">
              {tenants.length} shown
            </div>
          </div>
        </div>

        <div className="hi5-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b hi5-border bg-black/5 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Base price</th>
                  <th className="px-4 py-3">Trial ends</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {tenants.map((tenant: any) => {
                  const name = tenant.company_name || tenant.name || tenant.subdomain || tenant.id;
                  const workspace = `${tenant.subdomain || "custom"}.${tenant.domain || "hi5tech.co.uk"}`;
                  const billing = tenant.billing;

                  return (
                    <tr key={tenant.id} className="border-b hi5-border last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-bold">{name}</div>
                        <div className="text-xs opacity-60">{tenant.id}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold">{workspace}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full border hi5-border bg-black/5 px-2.5 py-1 text-xs font-bold dark:bg-white/5">
                          {billing?.billing_status || tenant.status || "unknown"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {billing?.plan_key || tenant.onboarding_product || tenant.plan || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {billing ? formatGBP(Number(billing.base_monthly_amount || 0)) : "—"}
                      </td>

                      <td className="px-4 py-3">
                        {formatDate(billing?.trial_ends_at || tenant.trial_ends_at)}
                      </td>

                      <td className="px-4 py-3">
                        {formatDate(tenant.created_at)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin-console/tenants/${tenant.id}`}
                          className="hi5-btn-ghost w-auto text-xs"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {!tenants.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center opacity-70">
                      No tenants found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PlatformAdminShell>
  );
}
