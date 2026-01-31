import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container">
      {/* HERO */}
      <section className="pt-10 sm:pt-14 pb-10">
        <div className="hi5-card p-6 sm:p-10">
          <div className="max-w-2xl">
            <div className="hi5-kicker">Hi5Tech Platform</div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight mt-2">
              Modern ITSM + RMM, built for MSPs and internal IT.
            </h1>
            <p className="text-base sm:text-lg hi5-muted mt-4">
              Multi-tenant by design. Branded per customer. Fast workflows, remote tooling,
              and a clean UX that works brilliantly on mobile.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link className="hi5-btn hi5-btn-primary" href="/signup">
                Create your tenant
              </Link>
              <Link className="hi5-btn" href="/features">
                Explore features
              </Link>
            </div>

            <div className="mt-6 text-sm hi5-muted">
              Includes: Incidents • SLA timers • Tabs UX • Remote tools • Tenant branding
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="pb-12">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="hi5-card p-5">
            <div className="font-semibold">ITSM that feels fast</div>
            <p className="text-sm hi5-muted mt-2">
              Mobile-first UI, tabbed navigation, and clean detail views that keep context.
            </p>
          </div>
          <div className="hi5-card p-5">
            <div className="font-semibold">RMM-ready foundation</div>
            <p className="text-sm hi5-muted mt-2">
              Designed to pair with device inventory, live actions, and remote sessions.
            </p>
          </div>
          <div className="hi5-card p-5">
            <div className="font-semibold">Tenant branding</div>
            <p className="text-sm hi5-muted mt-2">
              Per-tenant theme tokens (accent + gradients) so each customer looks “owned”.
            </p>
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="pb-14">
        <div className="hi5-panel p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="font-semibold text-lg">Ready to onboard your first tenant?</div>
            <div className="text-sm hi5-muted mt-1">
              Next step: signup → create tenant → provision subdomain → invite users.
            </div>
          </div>
          <Link className="hi5-btn hi5-btn-primary" href="/signup">
            Start signup
          </Link>
        </div>
      </section>
    </div>
  );
}
