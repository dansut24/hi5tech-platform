// apps/app/src/app/(modules)/control/ui/stat-cards.tsx
"use client";

import type { DeviceRow } from "./device-data";

function pillStyle(kind: "a" | "b" | "c") {
  if (kind === "a") return "bg-[rgba(var(--hi5-accent),0.10)] border-[rgba(var(--hi5-accent),0.25)]";
  if (kind === "b") return "bg-[rgba(var(--hi5-accent-2),0.10)] border-[rgba(var(--hi5-accent-2),0.25)]";
  return "bg-[rgba(var(--hi5-accent-3),0.10)] border-[rgba(var(--hi5-accent-3),0.25)]";
}

export default function StatCards({
  devices,
  activeFilter,
  onFilter,
}: {
  devices: DeviceRow[];
  activeFilter: "all" | "online" | "offline" | "warning";
  onFilter: (f: "all" | "online" | "offline" | "warning") => void;
}) {
  const total = devices.length;
  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const warning = devices.filter((d) => d.status === "warning").length;

  const card = (
    label: string,
    value: number,
    key: "all" | "online" | "offline" | "warning",
    kind: "a" | "b" | "c"
  ) => {
    const isActive = activeFilter === key;
    return (
      <button
        type="button"
        onClick={() => onFilter(key)}
        className={[
          "hi5-panel p-4 text-left transition w-full",
          "hover:translate-y-[-1px] active:translate-y-[0px]",
          isActive ? "ring-2 ring-[rgba(var(--hi5-accent),0.35)]" : "",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs opacity-70">{label}</div>
            <div className="text-2xl font-extrabold mt-1">{value}</div>
          </div>
          <div className={["rounded-2xl border px-3 py-1 text-xs font-semibold", pillStyle(kind)].join(" ")}>
            View
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {card("Total devices", total, "all", "a")}
      {card("Online", online, "online", "a")}
      {card("Offline", offline, "offline", "c")}
      {card("Alerts", warning, "warning", "b")}
    </div>
  );
}
