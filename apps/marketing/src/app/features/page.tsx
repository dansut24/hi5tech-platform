import Link from "next/link";

const sections = [
  {
    kicker: "Service Desk",
    title: "Ticketing that keeps context.",
    body: "Manage incidents, service requests, updates, files, assignments and SLAs from one clean workspace.",
    points: ["Incidents and requests", "SLA visibility", "Teams and ownership", "Activity timelines"],
  },
  {
    kicker: "Device Context",
    title: "See the endpoint behind the ticket.",
    body: "Link devices to tickets so technicians can see hostname, OS, online state and last seen without leaving the service desk.",
    points: ["Linked devices", "Online/offline status", "OS and architecture", "Last seen information"],
  },
  {
    kicker: "Premium Control",
    title: "Unlock remote tools when you need them.",
    body: "Add remote control, terminal, files and full inventory as premium capabilities without changing the core Service Desk experience.",
    points: ["Remote control", "Terminal", "File browser", "Full inventory"],
  },
  {
    kicker: "Automation",
    title: "Standardise repeatable work.",
    body: "Use scripts, monitoring, patching and reports to reduce repetitive work and improve operational consistency.",
    points: ["Script library", "Monitoring alerts", "Patch management", "Operational reports"],
  },
];

export default function FeaturesPage() {
  return (
    <div className="container py-14 sm:py-20">
      <div className="max-w-3xl">
        <div className="hi5-kicker">Features</div>
        <h1 className="mt-5 text-5xl sm:text-6xl font-black tracking-tight leading-[0.95]">
          One platform for tickets, devices and{" "}
          <span className="gradient-text">remote support.</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl hi5-muted leading-relaxed">
          Hi5Tech combines a modern Service Desk with endpoint visibility and premium remote management features.
        </p>
      </div>

      <div className="mt-12 grid gap-5">
        {sections.map((section, index) => (
          <div key={section.title} className="hi5-panel p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <div className="hi5-kicker">{section.kicker}</div>
                <h2 className="mt-5 text-3xl sm:text-5xl font-black tracking-tight">
                  {section.title}
                </h2>
                <p className="mt-4 text-lg hi5-muted leading-relaxed">{section.body}</p>

                <div className="mt-6 flex gap-3">
                  <Link href="/signup" className="hi5-btn hi5-btn-primary">
                    Start free trial
                  </Link>
                  <Link href="/pricing" className="hi5-btn">
                    View pricing
                  </Link>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {section.points.map((point) => (
                  <div key={point} className="hi5-card p-5">
                    <div className="text-sm hi5-muted">0{index + 1}</div>
                    <div className="mt-3 text-lg font-black">{point}</div>
                    <div className="mt-2 text-sm hi5-muted">
                      Designed to feel native to the Service Desk workflow.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 hi5-panel p-7 sm:p-10 text-center">
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
          Build your service desk first. Add Control when ready.
        </h2>
        <p className="mt-4 hi5-muted text-lg">
          Keep the product simple for users while unlocking premium endpoint capabilities as your needs grow.
        </p>
        <div className="mt-7">
          <Link href="/signup" className="hi5-btn hi5-btn-primary">
            Create your tenant →
          </Link>
        </div>
      </div>
    </div>
  );
}
