import Link from "next/link";

const plans = [
  {
    name: "Service Desk",
    price: "Core",
    description: "Modern ITSM for tickets, requests and basic device context.",
    highlight: false,
    features: [
      "Incidents and service requests",
      "Ticket comments and files",
      "SLA and priority tracking",
      "Teams and assignment",
      "Device context inside tickets",
      "Self-service portal",
    ],
  },
  {
    name: "Control Add-on",
    price: "Premium",
    description: "Endpoint management and remote support features for technicians.",
    highlight: true,
    features: [
      "Full device inventory",
      "Remote control",
      "Terminal access",
      "File browser",
      "Services and activity",
      "Device reporting",
    ],
  },
  {
    name: "Automation Suite",
    price: "Premium+",
    description: "Advanced operations for monitoring, scripts, patching and reporting.",
    highlight: false,
    features: [
      "Monitoring and alerts",
      "Script library",
      "Patch management",
      "Automation jobs",
      "Operational reports",
      "Audit and activity insights",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="container py-14 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="hi5-kicker mx-auto">Pricing</div>
        <h1 className="mt-5 text-5xl sm:text-6xl font-black tracking-tight leading-[0.95]">
          Start with Service Desk.{" "}
          <span className="gradient-text">Add Control when you need it.</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl hi5-muted leading-relaxed">
          Keep the core platform simple, then unlock premium endpoint management, remote tools and automation.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={[
              "hi5-panel p-6 sm:p-7 flex flex-col",
              plan.highlight ? "ring-2 ring-[rgba(var(--hi5-accent),0.35)]" : "",
            ].join(" ")}
          >
            {plan.highlight ? (
              <div className="hi5-kicker mb-4">Most popular</div>
            ) : null}

            <div className="text-2xl font-black">{plan.name}</div>
            <div className="mt-3 text-4xl font-black gradient-text">{plan.price}</div>
            <p className="mt-4 hi5-muted leading-relaxed">{plan.description}</p>

            <ul className="mt-6 grid gap-3 text-sm flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-[rgb(var(--hi5-accent))]">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className={[
                "hi5-btn mt-7",
                plan.highlight ? "hi5-btn-primary" : "",
              ].join(" ")}
            >
              Get started
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 hi5-card p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-black">Need MSP or larger tenant pricing?</h2>
            <p className="mt-2 hi5-muted">
              We can tailor pricing around tenants, devices, technicians and premium capabilities.
            </p>
          </div>
          <Link href="/contact" className="hi5-btn hi5-btn-primary">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
