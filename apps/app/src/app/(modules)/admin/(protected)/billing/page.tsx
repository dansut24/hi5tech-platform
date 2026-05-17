import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";
import {
  getTenantBillingProfile,
  getTenantFeatureMap,
  getTenantUsageCounts,
} from "@/lib/billing/tenant-billing";
import {
  PRICING_PLANS,
  formatGBP,
  type PlanKey,
} from "@/lib/billing/pricing";
import TrialBanner from "@/components/billing/trial-banner";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

function PlanCard({
  planKey,
  current,
  available,
}: {
  planKey: PlanKey;
  current: boolean;
  available: boolean;
}) {
  const plan = PRICING_PLANS[planKey];

  return (
    <div
      className={[
        "rounded-3xl border p-5",
        current
          ? "border-[rgba(var(--hi5-accent),0.45)] bg-[rgba(var(--hi5-accent),0.10)]"
          : "hi5-border bg-black/5 dark:bg-white/5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">{plan.label}</div>
          <p className="mt-2 text-sm leading-6 opacity-75">{plan.description}</p>
        </div>

        {current ? (
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-200">
            Current
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="text-3xl font-black">{formatGBP(plan.baseMonthly)}</div>
        <div className="text-sm opacity-70">per month base</div>
      </div>

      <div className="mt-4 space-y-2 text-sm opacity-80">
        {plan.perTechnician > 0 ? <div>{formatGBP(plan.perTechnician)} per technician / month</div> : null}
        {plan.perDevice > 0 ? <div>{formatGBP(plan.perDevice)} per device / month</div> : null}
        <div>14-day free trial</div>
        <div>Cancel anytime</div>
      </div>

      <div className="mt-5">
        {current ? (
          <button type="button" className="hi5-btn-ghost w-full" disabled>
            Current plan
          </button>
        ) : available ? (
          <Link
            href={`/admin/billing/upgrade?plan=${plan.key}`}
            className="hi5-btn-primary w-full"
          >
            Upgrade to {plan.shortLabel}
          </Link>
        ) : (
          <button type="button" className="hi5-btn-ghost w-full" disabled>
            Not available
          </button>
        )}
      </div>
    </div>
  );
}

async function loadPendingBillingChanges(tenantId: string) {
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("tenant_billing_changes")
    .select("id, change_type, from_plan, to_plan, status, created_at, scheduled_for")
    .eq("tenant_id", tenantId)
    .in("status", ["draft", "pending_approval", "scheduled"])
    .order("created_at", { ascending: false })
    .limit(10);

  return data ?? [];
}

export default async function BillingPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await supabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;

  const { data: membership } = user
    ? await supabase
        .from("memberships")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const isOwner = membership?.role === "owner";
  const isBillingAdmin = membership?.role === "billing_admin";
  const canViewBilling = isOwner || isBillingAdmin;

  const [billingResult, features, usage, pendingChanges] = await Promise.all([
    getTenantBillingProfile(tenantId),
    getTenantFeatureMap(tenantId),
    getTenantUsageCounts(tenantId),
    loadPendingBillingChanges(tenantId),
  ]);

  const billing = billingResult.billing;
  const plan = billingResult.plan;

  const estimatedMonthly =
    Number(billing.base_monthly_amount ?? plan.baseMonthly) +
    usage.technicianCount * Number(billing.per_technician_amount ?? plan.perTechnician) +
    usage.deviceCount * Number(billing.per_device_amount ?? plan.perDevice);

  const hasItsm = features.itsm_core === true;
  const hasControl =
    features.devices_inventory === true ||
    features.remote_control === true ||
    features.remote_terminal === true ||
    features.remote_files === true;

  return (
    <div className="hi5-page space-y-5">
      <div className="hi5-panel p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-60">Admin</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Billing</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 opacity-75">
              Manage your trial, plan, upgrade options and estimated monthly pricing.
            </p>
          </div>

          <Link href="/apps" className="hi5-btn-ghost w-auto text-sm">
            Back to apps
          </Link>
        </div>
      </div>

      {!canViewBilling ? (
        <div className="hi5-card p-5">
          <div className="text-lg font-extrabold">Billing access restricted</div>
          <p className="mt-2 text-sm opacity-75">
            Billing is currently visible to the workspace owner or billing admin only.
          </p>
        </div>
      ) : (
        <>
          <TrialBanner
            planLabel={plan.label}
            planKey={plan.key}
            daysRemaining={billingResult.daysRemaining}
            trialEndsAt={billing.trial_ends_at}
            baseMonthly={Number(billing.base_monthly_amount)}
            perTechnician={Number(billing.per_technician_amount)}
            perDevice={Number(billing.per_device_amount)}
            showBillingLink={false}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="hi5-card p-5">
              <div className="text-xs opacity-65">Current plan</div>
              <div className="mt-1 text-2xl font-black">{plan.shortLabel}</div>
              <div className="mt-2 text-sm opacity-70">{plan.label}</div>
            </div>

            <div className="hi5-card p-5">
              <div className="text-xs opacity-65">Estimated monthly</div>
              <div className="mt-1 text-2xl font-black">{formatGBP(estimatedMonthly)}</div>
              <div className="mt-2 text-sm opacity-70">After trial, based on current usage.</div>
            </div>

            <div className="hi5-card p-5">
              <div className="text-xs opacity-65">Technicians</div>
              <div className="mt-1 text-2xl font-black">{usage.technicianCount}</div>
              <div className="mt-2 text-sm opacity-70">{formatGBP(Number(billing.per_technician_amount))} each / month</div>
            </div>

            <div className="hi5-card p-5">
              <div className="text-xs opacity-65">Devices</div>
              <div className="mt-1 text-2xl font-black">{usage.deviceCount}</div>
              <div className="mt-2 text-sm opacity-70">{formatGBP(Number(billing.per_device_amount))} each / month</div>
            </div>
          </div>

          {pendingChanges.length ? (
            <div className="hi5-panel p-5">
              <div className="text-lg font-extrabold">Pending billing changes</div>
              <p className="mt-2 text-sm opacity-75">
                These changes have been requested but have not been applied yet.
              </p>

              <div className="mt-5 grid gap-3">
                {pendingChanges.map((change: any) => {
                  const toPlan = PRICING_PLANS[change.to_plan as PlanKey];

                  return (
                    <div
                      key={change.id}
                      className="rounded-2xl border hi5-border bg-black/5 p-4 dark:bg-white/5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-bold">
                            {change.change_type === "plan_change" ? "Plan change" : change.change_type}
                          </div>
                          <div className="mt-1 text-sm opacity-75">
                            {change.from_plan} → {toPlan?.label || change.to_plan}
                          </div>
                          <div className="mt-1 text-xs opacity-60">
                            Requested {formatDate(change.created_at)}
                            {change.scheduled_for ? ` · Scheduled ${formatDate(change.scheduled_for)}` : ""}
                          </div>
                        </div>

                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-200">
                          {String(change.status).replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="hi5-card p-5">
            <div className="text-lg font-extrabold">Current included modules</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {hasItsm ? (
                <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-sm font-bold dark:bg-white/5">
                  ITSM
                </span>
              ) : null}
              {hasControl ? (
                <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-sm font-bold dark:bg-white/5">
                  Control
                </span>
              ) : null}
              <span className="rounded-full border hi5-border bg-black/5 px-3 py-1 text-sm font-bold dark:bg-white/5">
                Admin
              </span>
            </div>
          </div>

          <div className="hi5-panel p-5">
            <div className="text-lg font-extrabold">Plans and upgrades</div>
            <p className="mt-2 text-sm opacity-75">
              Modules not included in your plan are hidden from Apps and can be added here.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <PlanCard
                planKey="itsm"
                current={plan.key === "itsm"}
                available={plan.key !== "itsm"}
              />
              <PlanCard
                planKey="control"
                current={plan.key === "control"}
                available={plan.key !== "control"}
              />
              <PlanCard
                planKey="both"
                current={plan.key === "both" || plan.key === "platform"}
                available={plan.key !== "both" && plan.key !== "platform"}
              />
            </div>
          </div>

          <div className="hi5-card p-5">
            <div className="text-lg font-extrabold">Billing note</div>
            <p className="mt-2 text-sm leading-6 opacity-75">
              Payments are not connected yet. This page shows the pricing and plan logic that will later connect to Stripe,
              manual invoicing, or your Hi5Tech platform admin billing portal.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
