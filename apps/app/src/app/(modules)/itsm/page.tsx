import Link from "next/link";

export default function ITSMDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ITSM Dashboard</h1>
          <p className="opacity-80">Live overview of your service desk.</p>
        </div>
        <Link className="underline" href="/apps">Back to modules</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["Open Incidents", "Unassigned", "Open Requests", "Pending Changes"].map((t) => (
          <div key={t} className="hi5-card p-4">
            <div className="text-sm opacity-70">{t}</div>
            <div className="text-2xl font-semibold mt-1">â€”</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="hi5-card p-4">
          <div className="font-semibold">My Work</div>
          <div className="text-sm opacity-70 mt-1">Assigned items will appear here.</div>
        </div>
        <div className="hi5-card p-4">
          <div className="font-semibold">Recent Activity</div>
          <div className="text-sm opacity-70 mt-1">Timeline feed will appear here.</div>
        </div>
      </div>
    </div>
  );
}