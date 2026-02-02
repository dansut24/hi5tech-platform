// apps/app/src/app/(modules)/control/ui/device-details-panel.tsx
import Link from "next/link";
import type { DeviceRow } from "./device-data";

function pill(status: DeviceRow["status"]) {
  if (status === "online") return "bg-emerald-500/10 border-emerald-500/25 text-emerald-100";
  if (status === "warning") return "bg-amber-500/10 border-amber-500/25 text-amber-100";
  return "bg-rose-500/10 border-rose-500/25 text-rose-100";
}

export default function DeviceDetailsPanel({
  device,
  compact,
}: {
  device: DeviceRow | null;
  compact?: boolean;
}) {
  return (
    <div className="hi5-panel p-5">
      {!device ? (
        <div className="text-sm opacity-80">Select a device to see details.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs opacity-70">Selected device</div>
              <div className="text-lg font-extrabold truncate mt-1">{device.name}</div>
              <div className="text-xs opacity-70 mt-1">{device.os}</div>
            </div>

            <span className={["rounded-full border px-3 py-1 text-xs font-semibold", pill(device.status)].join(" ")}>
              {device.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">User</div>
              <div className="font-semibold mt-1">{device.user ?? "—"}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">IP</div>
              <div className="font-semibold mt-1">{device.ip ?? "—"}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">Last seen</div>
              <div className="font-semibold mt-1">{device.lastSeen}</div>
            </div>
            <div className="hi5-card p-3">
              <div className="text-xs opacity-70">Tags</div>
              <div className="font-semibold mt-1 truncate">{device.tags.join(", ")}</div>
            </div>
          </div>

          <div className="hi5-card p-4">
            <div className="text-sm font-semibold">Quick actions</div>
            <div className="text-xs opacity-70 mt-1">
              Demo buttons for now — we’ll wire these into your agent/actions pipeline next.
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link className="hi5-btn-primary text-sm text-center" href={`/control/${device.id}?tab=remote`}>
                Remote
              </Link>
              <Link className="hi5-btn-ghost text-sm text-center" href={`/control/${device.id}?tab=terminal`}>
                Terminal
              </Link>
              <Link className="hi5-btn-ghost text-sm text-center" href={`/control/${device.id}?tab=files`}>
                Files
              </Link>
              <button className="hi5-btn-ghost text-sm" type="button" title="Demo">
                Reboot (soon)
              </button>
            </div>
          </div>

          {!compact ? (
            <div className="text-xs opacity-70 leading-relaxed">
              Next: plug into real inventory, online heartbeat, patch status, AV status, and last action results.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
