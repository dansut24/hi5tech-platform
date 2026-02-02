"use client";

import { useState } from "react";

import type { DeviceRow } from "../../ui/device-data";
import StatCards from "../../ui/stat-cards";
import DeviceTable from "../../ui/device-table";

export default function DevicesClient({ devices }: { devices: DeviceRow[] }) {
  const [filter, setFilter] = useState<"all" | "online" | "offline" | "warning">("all");

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatCards devices={devices} activeFilter={filter} onFilter={setFilter} />
      <DeviceTable devices={devices} filter={filter} />
    </div>
  );
}
