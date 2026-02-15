// apps/app/src/app/(modules)/admin/(protected)/tenant/page.tsx
import Link from "next/link";
import { ArrowRight, Palette, Boxes, ShieldCheck, LifeBuoy } from "lucide-react";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

type Card = {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  note?: string;
};

export default function AdminTenantPage() {
  const cards: Card[] = [
    {
      title: "Branding",
      desc: "Logo, accent colours, background and theme presets.",
      href: "/admin/settings/branding",
      icon: <Palette size={18} />,
      note: "Logo upload + theme editor",
    },
    {
      title: "Modules",
      desc: "Enable/disable ITSM, Control, Self Service and Admin.",
      href: "/admin/settings/modules",
      icon: <Boxes size={18} />,
      note: "Module toggles + default landing",
    },
    {
      title: "Security",
      desc: "Password policy, SSO, MFA requirements.",
      href: "/admin/settings/security",
      icon: <ShieldCheck size={18} />,
      note: "MFA enforcement + SSO",
    },
    {
      title: "Support & contacts",
      desc: "Support email, timezone, address, notifications.",
      href: "/admin/settings/support",
      icon: <LifeBuoy size={18} />,
      note: "Support details + comms",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenant settings</h1>
        <p className="text-sm opacity-80 mt-1">
          Branding, modules, security and tenant-level configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={cn(
              "hi5-panel p-6 block",
              "transition hover:translate-y-[-1px] hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="opacity-80">{c.icon}</span>
                  <h2 className="text-lg font-semibold">{c.title}</h2>
                </div>

                <p className="text-sm opacity-75 mt-1">{c.desc}</p>

                {c.note ? (
                  <div className="mt-4 text-sm opacity-70">{c.note}</div>
                ) : (
                  <div className="mt-4 text-sm opacity-70">Open settings</div>
                )}
              </div>

              <div className="shrink-0 rounded-xl border hi5-border p-2 opacity-70">
                <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
