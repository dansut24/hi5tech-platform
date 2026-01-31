import Link from "next/link";

export default function FeaturesPage() {
  const items = [
    { title: "Incidents & queues", desc: "Fast list views and clean detail pages built for speed." },
    { title: "Tabbed workflow", desc: "Keep context while you work across multiple items." },
    { title: "Mobile-first UX", desc: "Finger-friendly scrolling, sensible layouts, and great performance." },
    { title: "Tenant branding", desc: "Accent + gradients can match the customer’s brand." },
    { title: "Security-ready", desc: "Auth-first routing and a path to proper RLS + role policies." },
    { title: "RMM modules", desc: "Foundation for inventory, remote actions, scripts, and more." },
  ];

  return (
    <div className="container pt-10 pb-14">
      <div className="hi5-card p-6 sm:p-10">
        <div className="hi5-kicker">Features</div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
          Everything you need for service + remote management.
        </h1>
        <p className="hi5-muted mt-4 max-w-2xl">
          Built as a modular platform: ITSM today, with RMM and admin modules expanding alongside.
        </p>

        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {items.map((it) => (
            <div key={it.title} className="hi5-panel p-5">
              <div className="font-semibold">{it.title}</div>
              <div className="text-sm hi5-muted mt-2">{it.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Link className="hi5-btn hi5-btn-primary" href="/signup">Create tenant</Link>
          <Link className="hi5-btn" href="/pricing">See pricing</Link>
        </div>
      </div>
    </div>
  );
}
