import { Suspense } from "react";

export default function ITSMDashboard() {
  return (
    <div className="hi5-container py-6 space-y-8">
      {/* ===================== */}
      {/* HEADER */}
      {/* ===================== */}
      <div>
        <h1 className="text-2xl font-semibold">ITSM Dashboard</h1>
        <p className="opacity-80 mt-1">
          Live overview of your service desk
        </p>
      </div>

      {/* ===================== */}
      {/* KPI STRIP */}
      {/* ===================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Open Incidents" value="42" />
        <Kpi label="Open Requests" value="18" />
        <Kpi label="Unassigned" value="7" />
        <Kpi label="Breaching SLA" value="3" danger />
        <Kpi label="Resolved Today" value="21" />
        <Kpi label="Avg 1st Response" value="23m" />
      </div>

      {/* ===================== */}
      {/* MY WORK + UNASSIGNED */}
      {/* ===================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TicketList
          title="My Assigned Tickets"
          tickets={[
            { id: "INC-1042", title: "VPN not connecting", priority: "P2", age: "2h" },
            { id: "INC-1040", title: "Email delays", priority: "P1", age: "45m" },
          ]}
        />
        <TicketList
          title="Unassigned Tickets"
          tickets={[
            { id: "INC-1045", title: "New starter access", priority: "P3", age: "1h" },
            { id: "INC-1046", title: "Printer offline", priority: "P4", age: "3h" },
          ]}
        />
      </div>

      {/* ===================== */}
      {/* CHARTS */}
      {/* ===================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Incidents Opened vs Resolved">
          <FakeChart label="Last 14 days" />
        </ChartCard>

        <ChartCard title="Backlog Trend">
          <FakeChart label="Open incidents over time" />
        </ChartCard>
      </div>

      {/* ===================== */}
      {/* PRIORITY + CATEGORY */}
      {/* ===================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="By Priority">
          <FakeBar />
        </ChartCard>

        <ChartCard title="By Category">
          <FakeDonut />
        </ChartCard>
      </div>

      {/* ===================== */}
      {/* SLA HEALTH + ACTIVITY */}
      {/* ===================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="hi5-panel p-5 space-y-3">
          <h3 className="font-semibold">SLA Health</h3>
          <ul className="text-sm opacity-90 space-y-1">
            <li>✔ 92% within SLA</li>
            <li>⚠ 3 breaches today</li>
            <li>⏱ Avg resolution: 4h 12m</li>
            <li>🔥 Next breach in 37 minutes</li>
          </ul>
        </div>

        <div className="hi5-panel p-5">
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          <ul className="text-sm opacity-85 space-y-2">
            <li>INC-1046 assigned to Alex</li>
            <li>INC-1042 status changed → In Progress</li>
            <li>INC-1045 created by John</li>
            <li>INC-1040 resolved</li>
          </ul>
        </div>
      </div>

      {/* ===================== */}
      {/* QUICK ACTIONS */}
      {/* ===================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickAction label="New Incident" />
        <QuickAction label="New Request" />
        <QuickAction label="Search Tickets" />
        <QuickAction label="Reports" />
      </div>

      {/* ===================== */}
      {/* ANNOUNCEMENTS */}
      {/* ===================== */}
      <div className="hi5-panel p-5">
        <h3 className="font-semibold mb-2">Announcements</h3>
        <p className="text-sm opacity-85">
          🔧 Planned maintenance tonight 22:00–23:00 (VPN services)
        </p>
      </div>
    </div>
  );
}

/* ======================================================
   SMALL COMPONENTS
====================================================== */

function Kpi({ label, value, danger }: any) {
  return (
    <div className="hi5-panel p-4 text-center">
      <div className={`text-xl font-bold ${danger ? "text-red-500" : ""}`}>
        {value}
      </div>
      <div className="text-xs opacity-75 mt-1">{label}</div>
    </div>
  );
}

function TicketList({ title, tickets }: any) {
  return (
    <div className="hi5-panel p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm">
        {tickets.map((t: any) => (
          <li key={t.id} className="flex justify-between opacity-90">
            <span>
              <strong>{t.id}</strong> — {t.title}
            </span>
            <span>{t.priority} · {t.age}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <div className="hi5-panel p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function FakeChart({ label }: any) {
  return (
    <div className="h-40 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs opacity-60">
      {label} (chart placeholder)
    </div>
  );
}

function FakeBar() {
  return (
    <div className="h-40 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs opacity-60">
      Priority bar chart
    </div>
  );
}

function FakeDonut() {
  return (
    <div className="h-40 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs opacity-60">
      Category donut chart
    </div>
  );
}

function QuickAction({ label }: any) {
  return (
    <button className="hi5-btn-primary w-full">
      {label}
    </button>
  );
}
