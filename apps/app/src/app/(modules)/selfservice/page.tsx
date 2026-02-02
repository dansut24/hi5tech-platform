// apps/app/src/app/(modules)/selfservice/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="hi5-panel p-5">
      <div className="text-xs opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      {hint ? <div className="mt-2 text-xs opacity-70">{hint}</div> : null}
    </div>
  );
}

function ActionCard({
  title,
  desc,
  href,
  badge,
  kind,
}: {
  title: string;
  desc: string;
  href: string;
  badge: string;
  kind: "a" | "b" | "c";
}) {
  const pill =
    kind === "a"
      ? "bg-[rgba(var(--hi5-accent),0.12)] border-[rgba(var(--hi5-accent),0.28)]"
      : kind === "b"
      ? "bg-[rgba(var(--hi5-accent-2),0.12)] border-[rgba(var(--hi5-accent-2),0.28)]"
      : "bg-[rgba(var(--hi5-accent-3),0.12)] border-[rgba(var(--hi5-accent-3),0.28)]";

  return (
    <Link
      href={href}
      className="hi5-panel p-5 block transition hover:translate-y-[-1px] active:translate-y-[0px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold">{title}</div>
          <div className="text-sm opacity-75 mt-1">{desc}</div>
        </div>
        <div className={["rounded-2xl border px-3 py-1 text-xs font-semibold shrink-0", pill].join(" ")}>
          {badge}
        </div>
      </div>
    </Link>
  );
}

export default function SelfServiceHomePage() {
  // Demo stats for now (wire to Supabase later)
  const openIncidents = 2;
  const waitingOnMe = 1;
  const resolvedThisMonth = 6;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Self Service</h1>
          <p className="text-sm opacity-75 mt-2 max-w-2xl">
            Search help articles, raise incidents, and request equipment or access — without the admin complexity.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/apps" className="hi5-btn-ghost text-sm">
            Modules
          </Link>
          <Link href="/auth/signout" className="hi5-btn-ghost text-sm">
            Logout
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 md:grid-cols-3">
        <ActionCard
          title="Raise an incident"
          desc="Something broken or urgent? Tell us what happened and we’ll respond fast."
          href="/selfservice/incident/new"
          badge="Fast"
          kind="b"
        />
        <ActionCard
          title="Raise a request"
          desc="Need access, software, or equipment? Pick items and submit like a basket."
          href="/selfservice/request/new"
          badge="Catalogue"
          kind="a"
        />
        <ActionCard
          title="Knowledge base"
          desc="Find answers and step-by-step guides in seconds."
          href="/selfservice/kb"
          badge="Search"
          kind="c"
        />
      </div>

      {/* My work */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open tickets" value={String(openIncidents)} hint="Incidents & requests" />
        <StatCard label="Waiting on you" value={String(waitingOnMe)} hint="Needs your response" />
        <StatCard label="Resolved this month" value={String(resolvedThisMonth)} hint="Nice 😄" />
      </div>

      {/* Popular help */}
      <div className="hi5-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Popular help</div>
            <div className="text-xs opacity-70 mt-1">Quick categories (demo).</div>
          </div>
          <Link href="/selfservice/kb" className="hi5-btn-ghost text-sm">
            View all
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["Passwords", "Email", "Devices", "VPN", "Printing", "Apps"].map((c) => (
            <Link
              key={c}
              href={`/selfservice/kb?category=${encodeURIComponent(c)}`}
              className="rounded-full border hi5-border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      {/* Status + announcements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hi5-panel p-5">
          <div className="text-sm font-semibold">Service status</div>
          <div className="mt-2 rounded-2xl border hi5-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">All systems operational</div>
              <div className="text-xs opacity-70">Demo</div>
            </div>
            <div className="text-xs opacity-70 mt-1">Email • Network • Devices • Apps</div>
          </div>
        </div>

        <div className="hi5-panel p-5">
          <div className="text-sm font-semibold">Announcements</div>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="rounded-2xl border hi5-border p-4">
              <div className="font-medium">Scheduled maintenance</div>
              <div className="opacity-75 mt-1">
                Sunday 1am–2am: minor updates to device management services.
              </div>
            </li>
            <li className="rounded-2xl border hi5-border p-4">
              <div className="font-medium">Tip</div>
              <div className="opacity-75 mt-1">
                Use the search bar to find KB steps before raising a ticket.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
