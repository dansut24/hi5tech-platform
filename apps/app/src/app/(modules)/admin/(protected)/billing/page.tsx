import { getActiveTenantId } from "@/lib/tenant";
import { getTenantFeatures } from "@/lib/entitlements";

const plans = [
  {
    name: "ITSM Core",
    price: "Included",
    description: "Ticketing, request handling and basic device context.",
    features: [
      "Incidents and service requests",
      "Requester/self-service access",
      "Device context inside tickets",
      "Basic ticket files and updates",
    ],
  },
  {
    name: "Control Add-on",
    price: "Premium",
    description: "Unlock full RMM visibility and remote tools.",
    features: [
      "Full device inventory",
      "Remote control",
      "Terminal",
      "File browser",
      "Device activity",
    ],
  },
  {
    name: "Automation Suite",
    price: "Premium+",
    description: "Advanced management, monitoring and patching.",
    features: [
      "Script library",
      "Monitoring alerts",
      "Patch management",
      "Automation jobs",
      "Reporting",
    ],
  },
];

export default async function AdminBillingPage() {
  const tenantId = await getActiveTenantId();
  const features = await getTenantFeatures(tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plan & billing</h1>
        <p className="text-sm opacity-80 mt-1">
          Manage the features available to this tenant.
        </p>
      </div>

      <div className="hi5-panel p-5">
        <div className="text-sm font-semibold">Current enabled features</div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(features).map(([key, enabled]) => (
            <div
              key={key}
              className="rounded-2xl border hi5-border p-3 flex items-center justify-between gap-3"
            >
              <span className="text-sm">{key.replaceAll("_", " ")}</span>
              <span
                className={[
                  "rounded-full border px-2 py-0.5 text-xs",
                  enabled
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "hi5-border opacity-60",
                ].join(" ")}
              >
                {enabled ? "Enabled" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.name} className="hi5-panel p-5 flex flex-col">
            <div className="text-lg font-bold">{plan.name}</div>
            <div className="text-2xl font-extrabold mt-2">{plan.price}</div>
            <p className="text-sm opacity-75 mt-2">{plan.description}</p>

            <ul className="mt-4 space-y-2 text-sm opacity-85 flex-1">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>

            <button type="button" className="hi5-btn-primary text-sm mt-5">
              Contact sales / upgrade
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
