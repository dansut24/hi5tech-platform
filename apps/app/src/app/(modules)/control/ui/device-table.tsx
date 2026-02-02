"use client";

// apps/app/src/app/(modules)/control/ui/device-table.tsx
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DeviceRow } from "./device-data";

function statusDot(s: DeviceRow["status"]) {
  if (s === "online") return "bg-emerald-500";
  if (s === "warning") return "bg-amber-500";
  return "bg-zinc-400";
}

export default function DeviceTable({
  devices,
  filter,
}: {
  devices: DeviceRow[];
  filter: "all" | "online" | "offline" | "warning";
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return devices
      .filter((d) => (filter === "all" ? true : d.status === filter))
      .filter((d) => {
        if (!query) return true;
        return (
          d.name.toLowerCase().includes(query) ||
          d.os.toLowerCase().includes(query) ||
          (d.user || "").toLowerCase().includes(query) ||
          d.tags.join(" ").toLowerCase().includes(query) ||
          (d.ip || "").toLowerCase().includes(query)
        );
      });
  }, [devices, filter, q]);

  return (
    <div className="hi5-panel p-0 overflow-hidden">
      <div className="p-4 sm:p-5 border-b hi5-divider flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <div className="text-base font-semibold">Devices</div>
          <div className="text-xs opacity-70 mt-1">
            Search, filter, and launch remote tools instantly.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="hi5-input max-w-[320px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, OS, user, tag, IP…"
          />
          <button className="hi5-btn-primary" type="button">
            Add device
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-80">
            <tr className="border-b hi5-divider">
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">OS</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 opacity-70">
                  No devices match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b hi5-divider hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "h-2.5 w-2.5 rounded-full",
                          statusDot(d.status),
                        ].join(" ")}
                      />
                      <span className="text-xs opacity-80 capitalize">
                        {d.status}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      href={`/control/device/${encodeURIComponent(d.id)}`}
                      className="font-semibold hover:underline"
                    >
                      {d.name}
                    </Link>
                    {d.ip ? (
                      <div className="text-xs opacity-70 mt-0.5">{d.ip}</div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 opacity-90">{d.os}</td>

                  <td className="px-4 py-3">
                    {d.user ? d.user : <span className="opacity-60">—</span>}
                  </td>

                  <td className="px-4 py-3 opacity-80">{d.lastSeen}</td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {d.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border hi5-border px-2 py-1 text-xs opacity-90"
                        >
                          {t}
                        </span>
                      ))}
                      {d.tags.length > 3 ? (
                        <span className="rounded-full border hi5-border px-2 py-1 text-xs opacity-70">
                          +{d.tags.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="hi5-btn-ghost text-xs"
                        href={`/control/device/${d.id}?tab=remote`}
                      >
                        Remote
                      </Link>
                      <Link
                        className="hi5-btn-ghost text-xs"
                        href={`/control/device/${d.id}?tab=terminal`}
                      >
                        Terminal
                      </Link>
                      <Link
                        className="hi5-btn-ghost text-xs"
                        href={`/control/device/${d.id}?tab=files`}
                      >
                        Files
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
