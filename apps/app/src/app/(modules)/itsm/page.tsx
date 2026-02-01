"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function ITSMDashboard() {
  // ----------------------------
  // TEMPLATE DATA
  // ----------------------------
  const kpis = {
    openIncidents: 42,
    openRequests: 18,
    unassigned: 7,
    breaching: 3,
    resolvedToday: 21,
    avgFirstResponseMins: 23,
    withinSlaPct: 92,
    avgResolutionHours: 4.2,
    nextBreachMins: 37,
  };

  const openedVsResolved = [
    { day: "Mon", opened: 12, resolved: 9 },
    { day: "Tue", opened: 10, resolved: 11 },
    { day: "Wed", opened: 14, resolved: 12 },
    { day: "Thu", opened: 16, resolved: 13 },
    { day: "Fri", opened: 18, resolved: 15 },
    { day: "Sat", opened: 9, resolved: 10 },
    { day: "Sun", opened: 11, resolved: 12 },
    { day: "Mon2", opened: 15, resolved: 14 },
    { day: "Tue2", opened: 13, resolved: 15 },
    { day: "Wed2", opened: 17, resolved: 16 },
    { day: "Thu2", opened: 19, resolved: 18 },
    { day: "Fri2", opened: 21, resolved: 18 },
    { day: "Sat2", opened: 10, resolved: 12 },
    { day: "Sun2", opened: 12, resolved: 13 },
  ];

  // backlog trend derived-ish (template)
  const backlogTrend = [
    { day: "Mon", backlog: 38 },
    { day: "Tue", backlog: 37 },
    { day: "Wed", backlog: 39 },
    { day: "Thu", backlog: 42 },
    { day: "Fri", backlog: 45 },
    { day: "Sat", backlog: 44 },
    { day: "Sun", backlog: 42 },
    { day: "Mon2", backlog: 43 },
    { day: "Tue2", backlog: 41 },
    { day: "Wed2", backlog: 42 },
    { day: "Thu2", backlog: 44 },
    { day: "Fri2", backlog: 47 },
    { day: "Sat2", backlog: 46 },
    { day: "Sun2", backlog: 42 },
  ];

  const byPriority = [
    { name: "P1", value: 6 },
    { name: "P2", value: 14 },
    { name: "P3", value: 17 },
    { name: "P4", value: 11 },
  ];

  const byCategory = [
    { name: "Network", value: 12 },
    { name: "Email", value: 8 },
    { name: "Access", value: 10 },
    { name: "Hardware", value: 6 },
    { name: "Software", value: 6 },
  ];

  // NOTE: we are NOT specifying colors per your rule of thumb earlier.
  // Recharts will use its defaults. We only use CSS-ish fallback for pie cells if desired later.

  return (
    <div className="hi5-container py-6 space-y-8">
      {/* ===================== */}
      {/* HEADER */}
      {/* ===================== */}
      <div>
        <h1 className="text-2xl font-semibold">ITSM Dashboard</h1>
        <p className="opacity-80 mt-1">Live overview of your service desk</p>
      </div>

      {/* ===================== */}
      {/* KPI STRIP */}
      {/* ===================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Kpi label="Open Incidents" value={String(kpis.openIncidents)} />
        <Kpi label="Open Requests" value={String(kpis.openRequests)} />
        <Kpi label="Unassigned" value={String(kpis.unassigned)} />
        <Kpi label="Breaching SLA" value={String(kpis.breaching)} danger />
        <Kpi label="Resolved Today" value={String(kpis.resolvedToday)} />
        <Kpi label="Avg 1st Response" value={`${kpis.avgFirstResponseMins}m`} />
      </div>

      {/* ===================== */}
      {/* MY WORK + UNASSIGNED */}
      {/* ===================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TicketList
          title="My Assigned Tickets"
          tickets={[
            { id: "INC-1042", title: "VPN not connecting", priority: "P2", age: "2h", sla: "OK" },
            { id: "INC-1040", title: "Email delays", priority: "P1", age: "45m", sla: "RISK" },
          ]}
        />
        <TicketList
          title="Unassigned Tickets"
          tickets={[
            { id: "INC-1045", title: "New starter access", priority: "P3", age: "1h", sla: "OK" },
            { id: "INC-1046", title: "Printer offline", priority: "P4", age: "3h", sla: "OK" },
          ]}
        />
      </div>

      {/* ===================== */}
      {/* CHARTS */}
      {/* ===================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Incidents Opened vs Resolved" subtitle="Last 14 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={openedVsResolved} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="opened" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Backlog Trend" subtitle="Open incidents over time">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={backlogTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="backlog" strokeWidth={2} fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ===================== */}
      {/* PRIORITY + CATEGORY */}
      {/* ===================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="By Priority" subtitle="Current incident distribution">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPriority} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="By Category" subtitle="Top drivers of tickets">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {byCategory.map((_, idx) => (
                    <Cell key={idx} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ===================== */}
      {/* SLA HEALTH + ACTIVITY */}
      {/* ===================== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="hi5-panel p-5 space-y-3">
          <h3 className="font-semibold">SLA Health</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Within SLA" value={`${kpis.withinSlaPct}%`} />
            <MiniStat label="Breaches today" value={String(kpis.breaching)} />
            <MiniStat label="Avg resolution" value={`${kpis.avgResolutionHours}h`} />
            <MiniStat label="Next breach" value={`${kpis.nextBreachMins}m`} />
          </div>
          <p className="text-xs opacity-70">
            Tip: later we’ll calculate SLA risk from due_at vs now for each ticket.
          </p>
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

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="hi5-panel p-4 text-center">
      <div className={`text-xl font-extrabold ${danger ? "text-red-500" : ""}`}>{value}</div>
      <div className="text-xs opacity-75 mt-1">{label}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hi5-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {subtitle ? <p className="text-xs opacity-70 mt-1">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TicketList({
  title,
  tickets,
}: {
  title: string;
  tickets: { id: string; title: string; priority: string; age: string; sla: "OK" | "RISK" | "BREACH" }[];
}) {
  return (
    <div className="hi5-panel p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2 text-sm">
        {tickets.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-3 border-b hi5-divider pb-2 last:border-b-0 last:pb-0">
            <div>
              <div className="font-semibold">{t.id}</div>
              <div className="opacity-85">{t.title}</div>
              <div className="text-xs opacity-70 mt-1">
                Priority {t.priority} · Age {t.age}
              </div>
            </div>
            <SlaBadge state={t.sla} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlaBadge({ state }: { state: "OK" | "RISK" | "BREACH" }) {
  const cls =
    state === "OK"
      ? "bg-green-500/10 text-green-600 dark:text-green-300 border-green-500/20"
      : state === "RISK"
      ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20"
      : "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20";

  return (
    <span className={`shrink-0 rounded-full border px-2 py-1 text-xs ${cls}`}>
      {state}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border hi5-border p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function QuickAction({ label }: { label: string }) {
  return (
    <button type="button" className="hi5-btn-primary w-full">
      {label}
    </button>
  );
}
