import Link from "next/link";
import { formatGBP, planMonthlySummary } from "@/lib/billing/pricing";

export default function TrialBanner({
  planLabel,
  planKey,
  daysRemaining,
  trialEndsAt,
  baseMonthly,
  perTechnician,
  perDevice,
  showBillingLink = true,
}: {
  planLabel: string;
  planKey: string;
  daysRemaining: number;
  trialEndsAt?: string | null;
  baseMonthly: number;
  perTechnician: number;
  perDevice: number;
  showBillingLink?: boolean;
}) {
  const trialEndText = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="hi5-panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-extrabold">
            14-day free trial · {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining
          </div>

          <div className="mt-1 text-sm opacity-75">
            Current plan: <span className="font-semibold">{planLabel}</span>. After your trial:
            {" "}
            <span className="font-semibold">
              {formatGBP(baseMonthly)} / month
            </span>
            {perTechnician > 0 ? ` + ${formatGBP(perTechnician)} / technician` : ""}
            {perDevice > 0 ? ` + ${formatGBP(perDevice)} / device` : ""}.
            {" "}Cancel anytime or upgrade anytime.
          </div>

          <div className="mt-1 text-xs opacity-60">
            Trial ends {trialEndText}. Plan key: {planKey}.
          </div>
        </div>

        {showBillingLink ? (
          <Link href="/admin/billing" className="hi5-btn-primary w-auto text-sm">
            View billing
          </Link>
        ) : null}
      </div>
    </div>
  );
}
