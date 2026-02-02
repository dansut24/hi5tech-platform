// apps/app/src/app/(modules)/control/devices/page.tsx
import StatCards from "../ui/stat-cards";
import DeviceTable from "../ui/device-table";
import { demoDevices } from "../ui/device-data";

export const dynamic = "force-dynamic";

export default function ControlDevicesPage() {
  // For now: demo data (we’ll swap to real device inventory later)
  // You can pull from your /devices API or Supabase table once ready.

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Device Control</h1>
          <p className="text-sm opacity-75 mt-2 max-w-2xl">
            Monitor device health, launch remote tools, and take actions fast — built for a real RMM workflow.
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button className="hi5-btn-ghost text-sm" type="button" title="Coming soon">
            Quick actions (soon)
          </button>
          <button className="hi5-btn-primary text-sm" type="button">
            New alert rule
          </button>
        </div>
      </div>

      {/* Filterable stats + table */}
      <ControlDevicesInteractive />
    </div>
  );
}

// Split interactive part to client while keeping page server-rendered
function ControlDevicesInteractive() {
  // We can keep it simple: client component inside server page
  // by rendering a client wrapper below.
  return (
    <DevicesClient />
  );
}

// eslint-disable-next-line @next/next/no-async-client-component
function DevicesClient() {
  "use client";

  const [filter, setFilter] = (require("react") as typeof import("react")).useState<
    "all" | "online" | "offline" | "warning"
  >("all");

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatCards devices={demoDevices} activeFilter={filter} onFilter={setFilter} />
      <DeviceTable devices={demoDevices} filter={filter} />
    </div>
  );
}
