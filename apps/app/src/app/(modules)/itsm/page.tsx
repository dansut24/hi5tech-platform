import Link from "next/link";

export default async function ItsmDashboardPage() {
  return (
    <div className="p-4 sm:p-8 space-y-8">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ITSM Dashboard</h1>
          <p className="text-sm opacity-75 mt-1">
            Live overview of your service desk
          </p>
        </div>

        <Link
          href="/apps"
          className="hi5-btn-ghost text-sm"
        >
          Back to modules
        </Link>
      </div>

      {/* KPI CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Open Incidents", value: 24 },
          { label: "Breaching SLA", value: 3, danger: true },
          { label: "Unassigned", value: 7 },
          { label: "Open Requests", value: 12 },
          { label: "Pending Changes", value: 4 },
          { label: "Resolved Today", value: 18 },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="hi5-panel p-4"
          >
            <p className="text-xs opacity-70">{kpi.label}</p>
            <p
              className={`mt-2 text-2xl font-bold ${
                kpi.danger ? "text-red-400" : ""
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      {/* CHARTS */}
      <section className="grid lg:grid-cols-3 gap-6">
        {/* INCIDENT TREND */}
        <div className="hi5-panel p-5 lg:col-span-2">
          <h2 className="text-sm font-medium mb-3 opacity-80">
            Incident Trend (last 30 days)
          </h2>

          {/* Chart placeholder */}
          <div className="h-48 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-sm opacity-60">
            Line / area chart here
          </div>
        </div>

        {/* BREAKDOWN */}
        <div className="hi5-panel p-5">
          <h2 className="text-sm font-medium mb-3 opacity-80">
            Ticket Breakdown
          </h2>

          {/* Donut placeholder */}
          <div className="h-48 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-sm opacity-60">
            Donut chart here
          </div>
        </div>
      </section>

      {/* WORK + QUEUES */}
      <section className="grid lg:grid-cols-3 gap-6">
        {/* MY WORK */}
        <div className="hi5-panel p-5">
          <h2 className="text-sm font-semibold mb-4">My Work</h2>

          <ul className="space-y-3 text-sm">
            <li className="flex justify-between">
              <span>Assigned to me</span>
              <span className="font-medium">5</span>
            </li>
            <li className="flex justify-between">
              <span>Due today</span>
              <span className="font-medium">2</span>
            </li>
            <li className="flex justify-between">
              <span>Overdue</span>
              <span className="font-medium text-red-400">1</span>
            </li>
          </ul>
        </div>

        {/* PRIORITY QUEUES */}
        <div className="hi5-panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-4">
            Priority Queues
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Critical (P1)",
              "Unassigned",
              "Waiting on User",
              "Awaiting Approval",
            ].map((q) => (
              <div
                key={q}
                className="rounded-xl border hi5-border p-4 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <p className="text-sm font-medium">{q}</p>
                <p className="text-xs opacity-70 mt-1">
                  View items in this queue
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="hi5-panel p-5">
        <h2 className="text-sm font-semibold mb-4">
          Recent Activity
        </h2>

        <ul className="space-y-3 text-sm opacity-80">
          <li>Incident INC-1024 assigned to you</li>
          <li>Request REQ-553 approved</li>
          <li>SLA warning on INC-1018</li>
          <li>User replied to INC-1012</li>
        </ul>
      </section>

    </div>
  );
}
