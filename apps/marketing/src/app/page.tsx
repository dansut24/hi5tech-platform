import Link from "next/link";

const featureCards = [
  {
    title: "IT Service Management",
    body: "Incidents, requests, problems, changes and SLAs — built for teams that need fast workflows.",
    icon: "🎫",
  },
  {
    title: "Endpoint Visibility",
    body: "See linked devices directly from tickets, including online state, OS and last seen context.",
    icon: "🖥️",
  },
  {
    title: "Premium Remote Tools",
    body: "Unlock remote control, terminal and file management when your team is ready for RMM.",
    icon: "⚡",
  },
  {
    title: "Monitoring & Alerts",
    body: "Proactive device health, alerting and automation designed for modern IT operations.",
    icon: "🔔",
  },
  {
    title: "Automation & Scripts",
    body: "Run repeatable tasks, standardise fixes and save technician time across your estate.",
    icon: "⌘",
  },
  {
    title: "Reports & Insights",
    body: "Track tickets, SLA breaches, devices, workloads and operational performance.",
    icon: "📊",
  },
];

const logos = ["Northfield IT", "CloudCore", "PixelStone", "TechWorks", "Caldera"];

function DashboardMockup() {
  return (
    <div className="product-shell p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="logo-mark">H</span>
          <div>
            <div className="font-bold">Hi5Tech</div>
            <div className="text-xs hi5-muted">Service Desk</div>
          </div>
        </div>
        <div className="hidden sm:block rounded-full border border-white/10 px-3 py-1 text-xs hi5-muted">
          Search tickets, devices…
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-4 pt-4">
        <div className="hidden lg:grid gap-2 content-start">
          {["Dashboard", "Tickets", "Devices", "Monitoring", "Automation", "Reports"].map((item, i) => (
            <div
              key={item}
              className={[
                "rounded-xl px-3 py-2 text-sm",
                i === 0
                  ? "bg-[rgba(var(--hi5-accent),0.24)] text-[rgb(var(--hi5-fg))]"
                  : "hi5-muted",
              ].join(" ")}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="metric-card">
              <div className="text-xs hi5-muted">Open tickets</div>
              <div className="text-2xl font-black mt-1">128</div>
              <div className="text-xs text-emerald-400 mt-1">+12%</div>
            </div>
            <div className="metric-card">
              <div className="text-xs hi5-muted">SLA breaches</div>
              <div className="text-2xl font-black mt-1">7</div>
              <div className="text-xs text-emerald-400 mt-1">-21%</div>
            </div>
            <div className="metric-card">
              <div className="text-xs hi5-muted">Online devices</div>
              <div className="text-2xl font-black mt-1">642</div>
              <div className="text-xs text-emerald-400 mt-1">+8%</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Incidents over time</div>
              <div className="text-xs hi5-muted">7 days</div>
            </div>
            <div className="mt-5 h-28 rounded-2xl bg-[linear-gradient(135deg,rgba(var(--hi5-accent),0.22),rgba(var(--hi5-accent-2),0.08))] flex items-end gap-2 p-3">
              {[30, 44, 32, 58, 46, 66, 78, 61, 73, 88, 70, 52].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-[rgba(var(--hi5-accent),0.75)]"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="metric-card">
            <div className="font-semibold mb-3">Recent incidents</div>
            {[
              ["Email not syncing on mobile", "High", "Open"],
              ["VPN connection drops", "Medium", "Open"],
              ["New laptop setup request", "Low", "Open"],
            ].map(([title, priority, status]) => (
              <div key={title} className="grid grid-cols-[1fr_auto_auto] gap-3 py-2 border-t border-white/10 text-sm">
                <span>{title}</span>
                <span className="hi5-muted">{priority}</span>
                <span>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="container pt-14 sm:pt-20 pb-14">
        <div className="grid lg:grid-cols-[1fr_0.92fr] gap-10 items-center">
          <div>
            <div className="hi5-kicker">ITSM + endpoint management</div>

            <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              The all-in-one platform for service desk and{" "}
              <span className="gradient-text">endpoint management.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg sm:text-xl hi5-muted leading-relaxed">
              Hi5Tech combines enterprise-grade ITSM with powerful RMM capabilities, so MSPs
              and internal IT teams can move faster and deliver exceptional service.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link className="hi5-btn hi5-btn-primary" href="/signup">
                Create your tenant →
              </Link>
              <Link className="hi5-btn" href="/features">
                Explore features
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              {["Multi-tenant by design", "Branded per customer", "Fast, secure and reliable"].map((item) => (
                <div key={item} className="hi5-card p-4 text-sm font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <DashboardMockup />
        </div>
      </section>

      <section className="container pb-16">
        <div className="text-center text-xs hi5-muted font-bold tracking-[0.22em] uppercase">
          Trusted by IT teams and MSPs worldwide
        </div>
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {logos.map((logo) => (
            <div key={logo} className="hi5-card p-4 text-center font-black hi5-muted">
              {logo}
            </div>
          ))}
        </div>
      </section>

      <section className="container py-12">
        <div className="grid lg:grid-cols-[0.8fr_1fr] gap-10 items-end mb-8">
          <div>
            <div className="hi5-kicker">Built for efficiency</div>
            <h2 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight">
              Everything you need. All in one place.
            </h2>
          </div>
          <p className="text-lg hi5-muted leading-relaxed">
            From tickets to endpoints, automation to reporting — Hi5Tech helps your team
            work smarter without jumping between disconnected tools.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureCards.map((card) => (
            <div key={card.title} className="hi5-card p-6 min-h-[220px]">
              <div className="text-3xl">{card.icon}</div>
              <h3 className="mt-6 text-xl font-black">{card.title}</h3>
              <p className="mt-3 hi5-muted leading-relaxed">{card.body}</p>
              <Link href="/features" className="inline-flex mt-5 font-bold text-[rgb(var(--hi5-accent))]">
                Learn more →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-12">
        <div className="hi5-panel p-7 sm:p-10 overflow-hidden">
          <div className="grid lg:grid-cols-[0.85fr_1fr] gap-8 items-center">
            <div>
              <div className="hi5-kicker">Powerful. Flexible. Secure.</div>
              <h2 className="mt-5 text-4xl sm:text-5xl font-black tracking-tight">
                Built for MSPs. Loved by IT teams.
              </h2>
              <p className="mt-5 hi5-muted text-lg leading-relaxed">
                Hi5Tech is multi-tenant by design, so you can manage every customer from one
                secure platform with complete separation and branding.
              </p>

              <div className="mt-6 grid gap-3 text-sm font-semibold">
                <div>✓ Per-tenant branding</div>
                <div>✓ Role-based access</div>
                <div>✓ Secure data isolation</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Northfield Support", "98 devices", "42 users"],
                ["CloudCore MSP", "256 devices", "112 users"],
                ["Acme IT Solutions", "124 devices", "88 users"],
                ["Internal IT", "64 devices", "31 users"],
              ].map(([name, devices, users]) => (
                <div key={name} className="hi5-card p-5">
                  <div className="font-black">{name}</div>
                  <div className="hi5-muted text-sm mt-2">Tenant workspace</div>
                  <div className="mt-5 flex gap-2 text-xs">
                    <span className="rounded-full border border-white/10 px-3 py-1">{devices}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1">{users}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 text-center">
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
          Ready to modernise your IT operations?
        </h2>
        <p className="mt-4 hi5-muted text-lg">
          Get started in minutes. No credit card required.
        </p>
        <div className="mt-8">
          <Link className="hi5-btn hi5-btn-primary" href="/signup">
            Start your free trial →
          </Link>
        </div>
      </section>
    </>
  );
}
