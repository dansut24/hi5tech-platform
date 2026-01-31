import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="container pt-10 pb-14">
      <div className="hi5-card p-6 sm:p-10">
        <div className="hi5-kicker">Pricing</div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
          Simple pricing that scales.
        </h1>
        <p className="hi5-muted mt-4 max-w-2xl">
          We’ll finalise tiers as your signup flow and tenant provisioning are wired in.
          For now, here’s a solid baseline structure.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="hi5-panel p-6">
            <div className="font-semibold">Starter</div>
            <div className="text-sm hi5-muted mt-1">For small teams</div>
            <div className="text-3xl font-semibold mt-4">£—</div>
            <ul className="text-sm hi5-muted mt-4 space-y-2">
              <li>• ITSM core</li>
              <li>• Tenant branding</li>
              <li>• Email support</li>
            </ul>
          </div>

          <div className="hi5-panel p-6">
            <div className="font-semibold">Pro</div>
            <div className="text-sm hi5-muted mt-1">Most popular</div>
            <div className="text-3xl font-semibold mt-4">£—</div>
            <ul className="text-sm hi5-muted mt-4 space-y-2">
              <li>• ITSM + RMM modules</li>
              <li>• Advanced branding</li>
              <li>• Priority support</li>
            </ul>
          </div>

          <div className="hi5-panel p-6">
            <div className="font-semibold">Enterprise</div>
            <div className="text-sm hi5-muted mt-1">Large orgs / MSPs</div>
            <div className="text-3xl font-semibold mt-4">Custom</div>
            <ul className="text-sm hi5-muted mt-4 space-y-2">
              <li>• SSO options</li>
              <li>• Custom domains</li>
              <li>• Dedicated onboarding</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Link className="hi5-btn hi5-btn-primary" href="/signup">Create tenant</Link>
          <Link className="hi5-btn" href="/contact">Talk to us</Link>
        </div>
      </div>
    </div>
  );
}
