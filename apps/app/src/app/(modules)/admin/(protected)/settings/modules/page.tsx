// apps/app/src/app/(modules)/admin/(protected)/settings/modules/page.tsx
import Link from "next/link";
import { ArrowLeft, Boxes, ArrowRight } from "lucide-react";

export default function AdminModulesSettingsPage() {
  const modules = [
    {
      name: "ITSM",
      desc: "Tickets, knowledge base, SLAs, change/problem management.",
      href: "/itsm",
      enabled: true,
    },
    {
      name: "Control",
      desc: "Devices, remote tools, scripts, patching and actions.",
      href: "/control",
      enabled: true,
    },
    {
      name: "Self Service",
      desc: "End-user portal for requests, tickets and knowledge.",
      href: "/self-service",
      enabled: true,
    },
    {
      name: "Admin",
      desc: "Tenant settings, users, access control and billing.",
      href: "/admin",
      enabled: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tenant"
          className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition"
        >
          <ArrowLeft size={16} />
          Back to Tenant settings
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Modules</h1>
        <p className="text-sm opacity-80 mt-1">
          Enable or disable modules for this tenant and choose a default landing experience.
        </p>
      </div>

      <div className="hi5-panel p-6">
        <div className="flex items-center gap-2">
          <Boxes size={18} className="opacity-80" />
          <h2 className="text-lg font-semibold">Active modules</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {modules.map((m) => (
            <div key={m.name} className="rounded-2xl border hi5-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-xs opacity-70 mt-1">{m.desc}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full border hi5-border opacity-80">
                  {m.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button className="hi5-btn-ghost" disabled>
                  Toggle (soon)
                </button>
                <Link
                  href={m.href}
                  className="inline-flex items-center gap-2 text-sm hi5-accent"
                >
                  Open <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border hi5-border p-4">
          <div className="text-sm font-semibold">Coming next</div>
          <ul className="mt-2 text-sm opacity-75 list-disc pl-5 space-y-1">
            <li>Per-tenant module toggles saved in Supabase</li>
            <li>Default landing page per role (end user vs agent)</li>
            <li>Hidden module protection in routing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
