import Link from "next/link";

export default function NewTabPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">New Tab</h1>
        <p className="text-sm opacity-70">
          Quick links, recent items and open tabs will live here.
        </p>
      </div>

      <div className="hi5-card p-4 space-y-3">
        <div className="font-semibold">Open</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link className="rounded-xl border hi5-border px-3 py-2 text-sm" href="/itsm/incidents">
            Incidents
          </Link>
          <Link className="rounded-xl border hi5-border px-3 py-2 text-sm" href="/itsm/problems">
            Problems
          </Link>
          <Link className="rounded-xl border hi5-border px-3 py-2 text-sm" href="/itsm/changes">
            Changes
          </Link>
          <Link className="rounded-xl border hi5-border px-3 py-2 text-sm" href="/itsm/assets">
            Assets
          </Link>
        </div>
      </div>

      <div className="hi5-card p-4 text-sm opacity-80">
        Next: we’ll add “Recent incidents”, “Recent tabs”, and “Pinned shortcuts”.
      </div>
    </div>
  );
}
