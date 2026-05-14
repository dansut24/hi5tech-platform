import Link from "next/link";

const items = [
  {
    title: "Tenant isolation",
    body: "Each tenant is logically separated, with membership checks and row-level access controls across platform data.",
  },
  {
    title: "Secure signup flow",
    body: "Tenant creation, owner membership and invite delivery are handled server-side using Supabase admin APIs.",
  },
  {
    title: "Role-based access",
    body: "Owners, admins, agents and users can be granted different access across Service Desk, Self Service and Admin.",
  },
  {
    title: "Auditable activity",
    body: "Ticket updates, premium feature attempts and operational events can be captured in activity timelines.",
  },
  {
    title: "Secure remote access",
    body: "Premium remote support is entitlement-gated and designed around authenticated sessions and tenant context.",
  },
  {
    title: "Data protection ready",
    body: "The platform is built with separation, least-privilege checks and clear operational boundaries in mind.",
  },
];

export default function SecurityPage() {
  return (
    <div className="container py-14 sm:py-20">
      <div className="max-w-3xl">
        <div className="hi5-kicker">Security</div>
        <h1 className="mt-5 text-5xl sm:text-6xl font-black tracking-tight leading-[0.95]">
          Built with tenant security and{" "}
          <span className="gradient-text">controlled access</span> from day one.
        </h1>
        <p className="mt-6 text-lg sm:text-xl hi5-muted leading-relaxed">
          Hi5Tech is designed for service desks and MSPs that need clear tenant boundaries,
          secure provisioning and controlled access to premium endpoint tools.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="hi5-card p-6">
            <div className="text-xl font-black">{item.title}</div>
            <p className="mt-3 hi5-muted leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 hi5-panel p-7 sm:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Need to discuss security before rollout?
            </h2>
            <p className="mt-3 hi5-muted text-lg">
              We can walk through tenant isolation, onboarding, permissions and remote access controls.
            </p>
          </div>

          <Link href="/contact" className="hi5-btn hi5-btn-primary">
            Talk to us
          </Link>
        </div>
      </div>
    </div>
  );
}
