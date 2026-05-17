export type PlanKey = "itsm" | "control" | "both" | "platform";

export type PricingPlan = {
  key: PlanKey;
  label: string;
  shortLabel: string;
  description: string;
  baseMonthly: number;
  perTechnician: number;
  perDevice: number;
  includedModules: string[];
  featureKeys: string[];
};

export const TRIAL_DAYS = 14;
export const BILLING_CURRENCY = "GBP";

export const PRICING_PLANS: Record<PlanKey, PricingPlan> = {
  itsm: {
    key: "itsm",
    label: "ITSM only",
    shortLabel: "ITSM",
    description: "Service desk, incidents, requests, assets, self-service and admin.",
    baseMonthly: 29,
    perTechnician: 5,
    perDevice: 0,
    includedModules: ["itsm", "selfservice", "admin"],
    featureKeys: ["itsm_core"],
  },
  control: {
    key: "control",
    label: "RMM Control only",
    shortLabel: "Control",
    description: "Device inventory, remote control, terminal, files and monitoring foundation.",
    baseMonthly: 49,
    perTechnician: 0,
    perDevice: 1.5,
    includedModules: ["control", "admin"],
    featureKeys: [
      "devices_inventory",
      "devices_reporting",
      "remote_control",
      "remote_terminal",
      "remote_files",
      "scripts",
      "monitoring",
    ],
  },
  both: {
    key: "both",
    label: "ITSM + RMM Control",
    shortLabel: "Platform",
    description: "Full ITSM and Control platform with tickets, assets, devices and remote support.",
    baseMonthly: 69,
    perTechnician: 5,
    perDevice: 1.5,
    includedModules: ["itsm", "control", "selfservice", "admin"],
    featureKeys: [
      "itsm_core",
      "devices_ticket_context",
      "devices_inventory",
      "devices_reporting",
      "remote_control",
      "remote_terminal",
      "remote_files",
      "scripts",
      "monitoring",
    ],
  },
  platform: {
    key: "platform",
    label: "ITSM + RMM Control",
    shortLabel: "Platform",
    description: "Full ITSM and Control platform with tickets, assets, devices and remote support.",
    baseMonthly: 69,
    perTechnician: 5,
    perDevice: 1.5,
    includedModules: ["itsm", "control", "selfservice", "admin"],
    featureKeys: [
      "itsm_core",
      "devices_ticket_context",
      "devices_inventory",
      "devices_reporting",
      "remote_control",
      "remote_terminal",
      "remote_files",
      "scripts",
      "monitoring",
    ],
  },
};

export function normalisePlanKey(value: unknown): PlanKey {
  if (value === "itsm" || value === "control" || value === "both" || value === "platform") {
    return value;
  }

  return "platform";
}

export function getPricingPlan(value: unknown) {
  return PRICING_PLANS[normalisePlanKey(value)];
}

export function formatGBP(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculateTrialDaysRemaining(trialEndsAt?: string | null) {
  if (!trialEndsAt) return 0;

  const end = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(end)) return 0;

  const diff = end - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function planMonthlySummary(planKey: unknown) {
  const plan = getPricingPlan(planKey);

  const parts = [`${formatGBP(plan.baseMonthly)} / month base`];

  if (plan.perTechnician > 0) {
    parts.push(`${formatGBP(plan.perTechnician)} / technician`);
  }

  if (plan.perDevice > 0) {
    parts.push(`${formatGBP(plan.perDevice)} / device`);
  }

  return parts.join(" + ");
}
