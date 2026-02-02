// apps/app/src/app/(modules)/control/ui/device-table.tsx
"use client";

import Link from "next/link";
import type { DeviceRow } from "./device-data";

function statusDot(status: DeviceRow["status"]) {
  if (status === "online") return "bg-emerald-500";
  if (status === "warning") return "bg-amber-500";
  return "bg-rose-500";
}

function statusLabel(status: DeviceRow["status"]) {
  if (status === "online") return "Online";
  if (status === "warning") return "Alert";
  return "Offline";
}

function statusPill(status: DeviceRow["status"]) {
  if (status === "online") return "bg-emerald-500/10 border-emerald-500/25 text-emerald-200";
  if (status === "warning") return "bg-amber-500/10 border-amber-500/25 text-amber-100";
  return "bg-rose-500/10 border-rose-500/25 text-rose-200";
}

export default function DeviceTable({
  devices,
  selectedId,
  onSelect,
}: {
  devices: DeviceRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="hi5-panel p-0 overflow-hidden">
      <div className="px-4 py-3 border-b hi5-divider flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Device inventory</div>
          <div className="text-xs opacity-70">Select a device to view details and actions.</div>
        </div>

        <div className="hidden sm:flex gap-2">
          <button className="hi5-btn-ghost text-sm" type="button" title="Demo">
            Run action
          </button>
          <button className="hi5-btn-primary text-sm" type="button" title="Demo">
            Create alert
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-80">
            <tr className="border-b hi5-divider">
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 hidden md:table-cell">OS</th>
              <th className="px-4 py-3 hidden lg:table-cell">User</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3 text-right">Open</th>
            </tr>
          </thead>

          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td className="px-4 py-6 opacity-80" colSpan={6}>
                  No devices match your filters.
                </td>
              </tr>
            ) : (
              devices.map((d) => {
                const isActive = selectedId === d.id;
                return (
                  <tr
                    key={d.id}
                    className={[
                      "border-b hi5-divider cursor-pointer",
                      "hover:bg-black/5 dark:hover:bg-white/5 transition",
                      isActive ? "bg-white/10" : "",
                    ].join(" ")}
                    onClick={() => onSelect(d.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{d.name}</div>
                      <div className="text-xs opacity-70">
                        {d.ip ? d.ip : "—"} • {d.tags.join(" • ")}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                          statusPill(d.status),
                        ].join(" ")}
                      >
                        <span className={["h-2 w-2 rounded-full", statusDot(d.status)].join(" ")} />
                        {statusLabel(d.status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 hidden md:table-cell opacity-90">{d.os}</td>
                    <td className="px-4 py-3 hidden lg:table-cell opacity-90">
                      {d.user ? d.user : <span className="opacity-70">—</span>}
                    </td>
                    <td className="px-4 py-3 opacity-80">{d.lastSeen}</td>

                    <td className="px-4 py-3 text-right">
                      {/* IMPORTANT: correct route is /control/[id] */}
                      <Link
                        href={`/control/${encodeURIComponent(d.id)}?tab=overview`}
                        className="hi5-btn-ghost text-sm inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
