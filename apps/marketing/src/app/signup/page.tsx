import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="container pt-10 pb-14">
      <div className="hi5-card p-6 sm:p-10">
        <div className="hi5-kicker">Create tenant</div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
          Start your tenant signup
        </h1>
        <p className="hi5-muted mt-4 max-w-2xl">
          This page is the start of the onboarding flow. Next, we’ll wire it to:
          create tenant → create first admin user → generate subdomain → redirect into the app.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="hi5-panel p-6">
            <div className="font-semibold">Step 1 — Your organisation</div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-sm hi5-muted mb-1">Company name</div>
                <input className="hi5-input" placeholder="e.g. Acme IT Services" />
              </div>
              <div>
                <div className="text-sm hi5-muted mb-1">Desired subdomain</div>
                <input className="hi5-input" placeholder="e.g. acme" />
              </div>
            </div>
          </div>

          <div className="hi5-panel p-6">
            <div className="font-semibold">Step 2 — Admin account</div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-sm hi5-muted mb-1">Work email</div>
                <input className="hi5-input" placeholder="you@company.com" inputMode="email" />
              </div>
              <div>
                <div className="text-sm hi5-muted mb-1">Password</div>
                <input className="hi5-input" placeholder="••••••••" type="password" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button className="hi5-btn hi5-btn-primary" type="button" disabled>
            Continue (wire next)
          </button>
          <Link className="hi5-btn" href="/pricing">
            View pricing
          </Link>
        </div>

        <div className="mt-6 text-sm hi5-muted">
          Next: we’ll implement a real submit → Supabase tenant provisioning → redirect.
        </div>
      </div>
    </div>
  );
}
