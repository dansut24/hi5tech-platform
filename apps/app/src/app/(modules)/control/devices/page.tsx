// apps/app/src/app/(modules)/control/devices/page.tsx
import { demoDevices } from "../ui/device-data";
import DevicesClient from "./ui/devices-client";

export const dynamic = "force-dynamic";

export default function ControlDevicesPage() {
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

      <DevicesClient devices={demoDevices} />
    </div>
  );
}
