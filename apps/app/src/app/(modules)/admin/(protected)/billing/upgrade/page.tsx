import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";
import { getTenantBillingProfile } from "@/lib/billing/tenant-billing";
import { getPricingPlan, normalisePlanKey, formatGBP } from "@/lib/billing/pricing";

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

  const billingResult = await getTenantBillingProfile(tenantId);
  const currentPlan = billingResult.plan;
  const nextPlan = getPricingPlan(requestedPlan);

  return (
    <div className="hi5-page space-y-5">
      <div className="hi5-panel p-5">
        <div className="text-xs uppercase tracking-[0.18em] opacity-60">Billing</div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Upgrade preview</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 opacity-75">
          Review the requested plan change. Payment and approval workflows will be connected in the next billing pass.
        </p>
      </div>

      {!isOwner ? (
        <div className="hi5-card p-5">
          <div className="text-lg font-extrabold">Billing access restricted</div>
          <p className="mt-2 text-sm opacity-75">
            Billing upgrades are currently visible to the workspace owner only.
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
            </div>

            <div className="hi5-card p-5">
              <div className="text-sm opacity-65">Requested plan</div>
              <div className="mt-2 text-2xl font-black">{nextPlan.label}</div>
              <div className="mt-2 text-sm opacity-75">
                {formatGBP(nextPlan.baseMonthly)} / month base
              </div>
            </div>
          </div>

          <div className="hi5-card p-5">
            <div className="text-lg font-extrabold">Next implementation step</div>
            <p className="mt-2 text-sm leading-6 opacity-75">
              This page will create a pending billing change, request owner confirmation, and later either apply the change instantly
              or schedule it for production.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin/billing" className="hi5-btn-ghost w-auto">
                Back to billing
              </Link>
              <button className="hi5-btn-primary w-auto" disabled>
                Upgrade request coming soon
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
