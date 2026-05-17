import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";
import { getTenantBillingProfile } from "@/lib/billing/tenant-billing";
import { getPricingPlan, normalisePlanKey, formatGBP } from "@/lib/billing/pricing";
import UpgradeRequestButton from "@/components/billing/upgrade-request-button";

export const dynamic = "force-dynamic";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requestedPlan = normalisePlanKey(String(sp.plan || "both"));

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
  const canRequestUpgrade = isOwner || isBillingAdmin;

  const billingResult = await getTenantBillingProfile(tenantId);
  const currentPlan = billingResult.plan;
  const nextPlan = getPricingPlan(requestedPlan);

  const isSamePlan = currentPlan.key === nextPlan.key;
  const alreadyFullPlatform = currentPlan.key === "both" || currentPlan.key === "platform";

  return (
    <div className="hi5-page space-y-5">
      <div className="hi5-panel p-5">
        <div className="text-xs uppercase tracking-[0.18em] opacity-60">Billing</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Upgrade preview</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 opacity-75">
          Review the requested plan change. This creates a pending billing change for approval and later application.
        </p>
      </div>

      {!canRequestUpgrade ? (
        <div className="hi5-card p-5">
          <div className="text-lg font-extrabold">Billing access restricted</div>
          <p className="mt-2 text-sm opacity-75">
            Billing upgrades are currently visible to the workspace owner or billing admin only.
          </p>

          <div className="mt-5">
            <Link href="/admin/billing" className="hi5-btn-ghost w-auto">
              Back to billing
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="hi5-card p-5">
              <div className="text-sm opacity-65">Current plan</div>
              <div className="mt-2 text-2xl font-black">{currentPlan.label}</div>
              <div className="mt-2 text-sm opacity-75">
                {formatGBP(currentPlan.baseMonthly)} / month base
              </div>

              <div className="mt-4 space-y-1 text-sm opacity-75">
                {currentPlan.perTechnician > 0 ? (
                  <div>{formatGBP(currentPlan.perTechnician)} per technician / month</div>
                ) : null}
                {currentPlan.perDevice > 0 ? (
                  <div>{formatGBP(currentPlan.perDevice)} per device / month</div>
                ) : null}
              </div>
            </div>

            <div className="hi5-card p-5">
              <div className="text-sm opacity-65">Requested plan</div>
              <div className="mt-2 text-2xl font-black">{nextPlan.label}</div>
              <div className="mt-2 text-sm opacity-75">
                {formatGBP(nextPlan.baseMonthly)} / month base
              </div>

              <div className="mt-4 space-y-1 text-sm opacity-75">
                {nextPlan.perTechnician > 0 ? (
                  <div>{formatGBP(nextPlan.perTechnician)} per technician / month</div>
                ) : null}
                {nextPlan.perDevice > 0 ? (
                  <div>{formatGBP(nextPlan.perDevice)} per device / month</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="hi5-card p-5">
            <div className="text-lg font-extrabold">What happens next?</div>

            <div className="mt-3 space-y-3 text-sm leading-6 opacity-75">
              <p>
                This will create a pending billing change for your workspace. It will not immediately
                charge payment or change production access yet.
              </p>

              <p>
                In the next billing pass, pending changes will be able to be approved, scheduled, applied,
                or cancelled from this page and the Hi5Tech platform admin portal.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin/billing" className="hi5-btn-ghost w-auto">
                Back to billing
              </Link>

              {isSamePlan ? (
                <button className="hi5-btn-ghost w-auto" disabled>
                  Current plan selected
                </button>
              ) : alreadyFullPlatform ? (
                <button className="hi5-btn-ghost w-auto" disabled>
                  Already on full platform
                </button>
              ) : (
                <UpgradeRequestButton
                  plan={nextPlan.key}
                  label={`Request upgrade to ${nextPlan.shortLabel}`}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
