import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="container py-14 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="hi5-kicker">Start free trial</div>
          <h1 className="mt-5 text-5xl sm:text-6xl font-black tracking-tight leading-[0.95]">
            Create your Hi5Tech{" "}
            <span className="gradient-text">tenant workspace</span>.
          </h1>
          <p className="mt-6 text-lg sm:text-xl hi5-muted leading-relaxed">
            Start with Service Desk, link devices into tickets, then unlock premium Control,
            automation and monitoring when your team is ready.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              "14-day trial",
              "Tenant subdomain created automatically",
              "Owner invite sent to your email",
              "No card required",
            ].map((item) => (
              <div key={item} className="hi5-card p-4 font-bold">
                ✓ {item}
              </div>
            ))}
          </div>
        </div>

        <div className="hi5-panel p-6 sm:p-8">
          <div className="text-2xl font-black">Create tenant</div>
          <p className="mt-2 hi5-muted">
            This will create your tenant, owner profile and initial access.
          </p>

          <div className="mt-6">
            <SignupForm />
          </div>
        </div>
      </div>
    </div>
  );
}
